/**
 * Cloudflare Worker - Sheduled Telegram Ping
 * - Call every 5 minutes with Cron Triggers
 * - Send a Telegram message to verifiate pipeline
 */

export default 
{
    async scheduled(event, env, ctx) 
    {
        if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID)
        {
            console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables.");
            return;
        }

        const isoDateNow = new Date().toISOString();
        const message = `Ping from Cloudflare Worker at ${isoDateNow}`;

        const isTelegramMessageSent =  await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, message);
        if (!isTelegramMessageSent)
        {
            console.error("Failed to send Telegram message.");
        }
    },

    async fetch(request, env)
    {
        return new Response("OK", { status: 200 });
    }
};

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
