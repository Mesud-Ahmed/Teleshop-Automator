import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// You must add these secrets in your Supabase Dashboard Edge Function settings!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const ADMIN_GROUP_ID = Deno.env.get('ADMIN_GROUP_ID')!

serve(async (req) => {
  // Parse the webhook payload
  const payload = await req.json()

  // Ensure it's an INSERT trigger
  if (payload.type === 'INSERT' && payload.table === 'orders') {
    const order = payload.record
    
    // Construct the formatted message
    const alertMessage = `🚨 <b>NEW ORDER!</b>\n\n` +
      `<b>Phone:</b> ${order.phone}\n` +
      `<b>Address:</b> ${order.address}\n` +
      `<b>Quantity:</b> ${order.quantity}\n` +
      `<b>Notes:</b> ${order.notes || "None"}`

    // Construct the Inline Keyboard for the Admin Group
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🏁 Delivered", callback_data: `deliver:${order.id}:${order.user_tg_id}` },
          { text: "❌ Reject", callback_data: `reject:${order.id}:${order.user_tg_id}` }
        ]
      ]
    }

    // Call the Telegram sendMessage API directly
    const botUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    
    try {
      const tgResponse = await fetch(botUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_GROUP_ID,
          text: alertMessage,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard
        })
      })

      if (!tgResponse.ok) {
        throw new Error(`Telegram error: ${await tgResponse.text()}`)
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 })
    } catch (err) {
      console.error(err)
      return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
  }

  return new Response(JSON.stringify({ status: "ignored" }), { status: 200 })
})
