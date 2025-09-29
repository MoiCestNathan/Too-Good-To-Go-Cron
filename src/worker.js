/**
 * Cloudflare Worker - Sheduled Telegram Ping
 * - Call every 5 minutes with Cron Triggers
 * - Send a Telegram message to verifiate pipeline
 */

export default 
{
    async scheduled(event, env, ctx) 
    {
        ensureSecrets(env);

        const state = await loadState(env);

        state.runCount = (state.runCount ?? 0) + 1;
        state.lastRun = new Date().toISOString();

        const message = `Ping from Cloudflare Worker at ${state.lastRun}`;

        const isTelegramMessageSent = await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, message);
        if (!isTelegramMessageSent)
        {
            console.error("Failed to send Telegram message.");
        }
        await saveState(env, state);
    },

    async fetch(request, env)
    {
        const url = new URL( request.url);
        if (url.pathname === "/stats")
        {
            const state = await loadState(env);
            return json({runCount: state.runCount ?? 0, lastRun: state.lastRun ?? null});
        }
        return new Response("OK", { status: 200 });
    }
};

function ensureSecrets(env)
{
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID)
    {
        throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables.");
    }
}

async function loadState(env)
{
    const stateJson = await env.STATE.get("STATE_JSON");
    return stateJson ? JSON.parse(stateJson) : {runCount: 0, lastRun: null, alerts: {}};
}

async function saveState(env, obj)
{
    await env.STATE.put("STATE_JSON", JSON.stringify(obj));
}

async function sendTelegramMessage(TelegramBotToken, TelegramBotChatId, messageToSend)
{
    try 
    {
        const url = `https://api.telegram.org/bot${TelegramBotToken}/sendMessage`;
        
        const body = new URLSearchParams({
            chat_id: TelegramBotChatId,
            text: messageToSend,
            parse_mode: "HTML"
        });

        const response = await fetch(url, {
            method: "POST",
            body: body
        });

        if (!response.ok) 
        {
            const errorText = await safeText(response);
            console.warn("Telegram API responded with an error:", response.status, errorText);
            return false;
        }
        return true;

    } catch (error) 
    {
        console.error("Error sending Telegram message:", error);
        return false;
    }
}

async function safeText(response)
{
    try 
    {
        return await response.text();   
    } catch 
    {
        return "<no-body-response>";
    }
}
