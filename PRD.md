Project Overview
Project Name: TeleShop Automator (AI + Mini App Edition)
Objective: To transform manual Telegram "text-link" Ethiopian telegram shops into a professional, data-driven sales engine. The system automates the creative overhead of posting and the logistical friction of order collection, ensuring the owner remains "lazy" while the business scales.
Features List
Admin-Facing (Owner Tools)
Lazy-Post Generator (AI-Powered):
Multimodal Input: Accepts photos or demo videos and description of products.
Real-Time Fulfillment Dashboard (Admin Group):
Instant alerts in a private group containing the full order "package" (Customer details,).
Automated Inventory & Sales Logging:
Every order status change triggers an automatic update in a centralized Supabase database. Admin can view daily sales reports and inventory status through a simple, real-time dashboard within the admin bot.
Customer-Facing (Ordering Experience)
Telegram Mini App (TMA) Checkout:
A high-performance React/Tailwind UI that opens instantly within Telegram (no external browser needed).
Frictionless Data Collection: the customer fills in his phone number and address and optional note in a simple form
Order Tracking:
Automated status notifications (e.g.,"Out for Delivery") sent directly to the customer’s chat.
User Flow / Use Cases
Use Case A: Product Listing (The "Lazy" Owner)
Input: The owner sends a 10-second product video or photos and a description to the Admin Bot.
Publishing: The owner clicks [ 🚀 Post to Channel ] . The bot publishes to the public channel with a unique 🛒 Order Now button (eg t.me/your_bot_username/app_name?startapp=waffle_2200)
Use Case B: Frictionless Ordering (The Customer)
Entry: Customer clicks 🛒 Order Now on a channel post.
Interface: The Telegram Mini App slides up (React-based UI).
Collection: Customer types his phone number and address and quantity and any notes and submit. UX Polish; Use Haptic Feedback (WebApp.HapticFeedback.impactOccurred('medium')) when the customer hits "Submit" to give it a premium feel.
Use Case C: Fulfillment & Logging
Alert: The Admin Group receives a detailed message: New Order #1234.
Action: The owner manually sends the product and address with their delivery rider. then Once the rider confirms delivery, the owner clicks a final button: [ 🏁Delivered ]. Then the Supabase database updates to Completed. then The bot sends a "Thank You" to the customer: "Your order has been delivered! We hope you love your Waffle Maker. Reply to this chat if you have any questions."
If Rejected: The owner is prompted to type a reason , which the bot forwards to the customer. the Supabase database: order record is marked as Rejected.