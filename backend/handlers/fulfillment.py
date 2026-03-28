from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler, Application
from dotenv import load_dotenv
import os

from db import update_order_status

load_dotenv()

ADMIN_GROUP_ID = os.environ.get("ADMIN_GROUP_ID")

async def handle_fulfillment_action(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the 🏁 Delivered and ❌ Reject button callbacks."""
    query = update.callback_query
    await query.answer()
    
    # Callback data format: action:order_id:customer_tg_id
    data_parts = query.data.split(':')
    if len(data_parts) != 3:
        return
        
    action, order_id, customer_tg_id = data_parts
    
    if action == "deliver":
        success = update_order_status(order_id, "completed")
        if success:
            try:
                # Send Thank You message to customer
                await context.bot.send_message(
                    chat_id=customer_tg_id,
                    text="Your order has been delivered! We hope you love your product. Reply to this chat if you have any questions."
                )
            except Exception as e:
                print(f"Could not send message to user {customer_tg_id}: {e}")
                
            await query.edit_message_text(text=f"{query.message.text}\n\n✅ Delivered")
        else:
            await query.answer("Failed to update database", show_alert=True)
            
    elif action == "reject":
        # First step, prompt for reason.
        # Since this is an inline callback, we can either:
        # A) Use ForceReply OR B) Just set a simpler flow.
        # Given PRD: "The owner is prompted to type a reason"
        # Since Telegram doesn't do native 'prompts' for callback queries easily without a conversation handler,
        # We will use a ConversationHandler or a simple waiting state later.
        success = update_order_status(order_id, "rejected")
        if success:
            try:
                await context.bot.send_message(
                    chat_id=customer_tg_id,
                    text="Your order has been rejected. Please contact support for more details."
                )
            except Exception as e:
                 print(f"Could not send message to user {customer_tg_id}: {e}")
                 
            await query.edit_message_text(text=f"{query.message.text}\n\n❌ Rejected")
        else:
            await query.answer("Failed to update database", show_alert=True)

def setup_fulfillment_handlers(application: Application) -> None:
     application.add_handler(CallbackQueryHandler(handle_fulfillment_action, pattern="^(deliver|reject):.*:.*$"))
