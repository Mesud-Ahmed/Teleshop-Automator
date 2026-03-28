import os
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes, MessageHandler, filters, CallbackQueryHandler, Application

load_dotenv()

PUBLIC_CHANNEL = os.environ.get("TELEGRAM_PUBLIC_CHANNEL")

async def handle_admin_media(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles incoming photos or videos from the admin."""
    # Only process private messages
    if update.effective_chat.type != 'private':
        return
        
    message = update.message
    caption = message.caption or ""
    
    # Check if media is photo or video
    media_file_id = None
    media_type = None
    
    if message.photo:
        media_file_id = message.photo[-1].file_id  # Get highest resolution
        media_type = "photo"
    elif message.video:
        media_file_id = message.video.file_id
        media_type = "video"
        
    if not media_file_id:
        return
        
    # Store media temporarily in context
    context.user_data['pending_post'] = {
        'file_id': media_file_id,
        'type': media_type,
        'caption': caption
    }
    
    keyboard = [
        [InlineKeyboardButton("🚀 Post to Channel", callback_data="post_to_channel")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Media received! Ready to post to public channel?",
        reply_markup=reply_markup
    )

async def post_to_channel_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the 🚀 Post to Channel button callback."""
    query = update.callback_query
    await query.answer()
    
    pending_post = context.user_data.get('pending_post')
    if not pending_post:
        await query.edit_message_text(text="No pending post found. Please send the media again.")
        return
        
    if not PUBLIC_CHANNEL:
        await query.edit_message_text(text="Configuration error: TELEGRAM_PUBLIC_CHANNEL is not set in `.env`")
        return

    # TODO: generate the web_app URL to point to Vercel production deployment
    # For now, placeholder or localhost tunnel
    web_app_url = "https://example.com/checkout" # We will update this later
    
    keyboard = [
        [InlineKeyboardButton("🛒 Order Now", web_app=WebAppInfo(url=web_app_url))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    try:
        if pending_post['type'] == 'photo':
            await context.bot.send_photo(
                chat_id=PUBLIC_CHANNEL,
                photo=pending_post['file_id'],
                caption=pending_post['caption'],
                reply_markup=reply_markup
            )
        elif pending_post['type'] == 'video':
            await context.bot.send_video(
                chat_id=PUBLIC_CHANNEL,
                video=pending_post['file_id'],
                caption=pending_post['caption'],
                reply_markup=reply_markup
            )
            
        await query.edit_message_text(text="✅ Successfully posted to the channel!")
        # Clear the pending post
        context.user_data.pop('pending_post', None)
    except Exception as e:
        await query.edit_message_text(text=f"Failed to post to channel: {str(e)}")


def setup_admin_handlers(application: Application) -> None:
    application.add_handler(MessageHandler(filters.PHOTO | filters.VIDEO, handle_admin_media))
    application.add_handler(CallbackQueryHandler(post_to_channel_callback, pattern="^post_to_channel$"))
