import os
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, InputMediaPhoto, InputMediaVideo
from telegram.ext import ContextTypes, MessageHandler, filters, CallbackQueryHandler, Application

load_dotenv()

PUBLIC_CHANNEL = os.environ.get("TELEGRAM_PUBLIC_CHANNEL")

async def handle_admin_media(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles incoming photos or videos from the admin (supports multiple images/albums)."""
    if update.effective_chat.type != 'private':
        return
        
    message = update.message
    caption = message.caption or ""
    
    media_file_id = None
    media_type = None
    
    if message.photo:
        media_file_id = message.photo[-1].file_id
        media_type = "photo"
    elif message.video:
        media_file_id = message.video.file_id
        media_type = "video"
        
    if not media_file_id:
        return
        
    # Initialize or get the current media collection
    if 'pending_media' not in context.user_data:
        context.user_data['pending_media'] = []
        
    # Add the newly received media
    context.user_data['pending_media'].append({
        'file_id': media_file_id,
        'type': media_type,
        'caption': caption
    })

    # To group multiple images that arrive at the exact same time, we set a 1.5 second delay.
    # Every time a new image in the album arrives, we cancel the old timer and start a new one.
    if 'media_timeout_job' in context.user_data:
        context.user_data['media_timeout_job'].schedule_removal()
        
    new_job = context.job_queue.run_once(
        send_preview_button, 
        1.5, 
        data=context.user_data, 
        chat_id=update.effective_chat.id,
        user_id=update.effective_user.id
    )
    context.user_data['media_timeout_job'] = new_job

async def send_preview_button(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Triggered 1.5s after the last photo is received to offer the Post button."""
    job = context.job
    chat_id = job.chat_id
    user_data = job.data
    
    media_count = len(user_data.get('pending_media', []))
    if media_count == 0:
        return
        
    keyboard = [[InlineKeyboardButton("🚀 Post to Channel", callback_data="post_to_channel")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await context.bot.send_message(
        chat_id=chat_id,
        text=f"✅ Received {media_count} media file(s) and description!\nReady to post to public channel?",
        reply_markup=reply_markup
    )

async def post_to_channel_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the 🚀 Post to Channel button callback."""
    query = update.callback_query
    await query.answer()
    
    pending_media = context.user_data.get('pending_media', [])
    if not pending_media:
        await query.edit_message_text(text="No pending post found. Please send the media again.")
        return
        
    if not PUBLIC_CHANNEL:
        await query.edit_message_text(text="Configuration error: TELEGRAM_PUBLIC_CHANNEL is not set in `.env`")
        return

    try:
        # Group captions from all media (in case they wrote text on multiple images)
        full_caption = "\n\n".join([m['caption'] for m in pending_media if m['caption']])
        
        # Generate a Base64URL slug to safely pass Amharic/Emojis without database storage!
        import base64
        short_caption = full_caption.strip()[:40] if full_caption else "Direct Item"
        slug_bytes = short_caption.encode('utf-8')
        # Remove padding `=` because Telegram `startapp` only allows A-Za-z0-9_-
        slug = base64.urlsafe_b64encode(slug_bytes).decode('utf-8').rstrip('=')

        bot_username = context.bot.username
        mini_app_short_name = "app" # ⚠️ CHANGE THIS IF NEEDED!
        bot_app_url = f"https://t.me/{bot_username}/{mini_app_short_name}?startapp={slug}"
        
        keyboard = [[InlineKeyboardButton("🛒 Order Now", url=bot_app_url)]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        if len(pending_media) == 1:
            # Single Media Case: We can attach the button directly to the image!
            m = pending_media[0]
            if m['type'] == 'photo':
                await context.bot.send_photo(PUBLIC_CHANNEL, photo=m['file_id'], caption=full_caption, reply_markup=reply_markup)
            else:
                await context.bot.send_video(PUBLIC_CHANNEL, video=m['file_id'], caption=full_caption, reply_markup=reply_markup)
        else:
            # Multiple Media Case (Album)
            # Telegram DOES NOT allow buttons on albums, so we send the album first...
            media_group = []
            for i, m in enumerate(pending_media):
                # Put the caption on the first image in the album
                cap = full_caption if i == 0 else ""
                
                if m['type'] == 'photo':
                    media_group.append(InputMediaPhoto(media=m['file_id'], caption=cap))
                else:
                    media_group.append(InputMediaVideo(media=m['file_id'], caption=cap))
                    
            await context.bot.send_media_group(chat_id=PUBLIC_CHANNEL, media=media_group)
            
            # ... And then send the button immediately after!
            await context.bot.send_message(
                chat_id=PUBLIC_CHANNEL,
                text="Tap below to place your order ⚡",
                reply_markup=reply_markup
            )
            
        await query.edit_message_text(text=f"✅ Successfully posted {len(pending_media)} media file(s) to the channel!")
        # Clear the pending post state
        context.user_data['pending_media'] = []
        
    except Exception as e:
        await query.edit_message_text(text=f"Failed to post to channel: {str(e)}")

def setup_admin_handlers(application: Application) -> None:
    application.add_handler(MessageHandler(filters.PHOTO | filters.VIDEO, handle_admin_media))
    application.add_handler(CallbackQueryHandler(post_to_channel_callback, pattern="^post_to_channel$"))
