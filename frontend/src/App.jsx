import { useState, useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import { CheckCircle2, ShoppingBag } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase safely
let supabase = null;
let initError = null;

try {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANNON_KEY || ''
  
  if (!supabaseUrl) {
    initError = "Missing VITE_SUPABASE_URL environment variable."
  } else if (!supabaseKey) {
    initError = "Missing VITE_SUPABASE_ANNON_KEY environment variable."
  } else {
    supabase = createClient(supabaseUrl, supabaseKey)
  }
} catch (e) {
  initError = e.message;
}


function App() {
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    quantity: 1,
    notes: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  useEffect(() => {
    try {
      // Notify telegram we are ready and expand the view
      WebApp.ready()
      WebApp.expand()
      // Set header color to match dark mode theme
      WebApp.setHeaderColor('#09090b')
    } catch (e) {
      console.error("Telegram WebApp API error:", e)
    }
  }, [])

  if (initError) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <div className="bg-destructive/20 text-destructive border border-destructive p-6 rounded-xl max-w-sm">
          <h2 className="font-bold text-lg mb-2">Build Configuration Error</h2>
          <p className="text-sm font-mono break-words">{initError}</p>
          <p className="text-xs mt-4 text-muted-foreground">Make sure you have set the variables in Vercel before the build.</p>
        </div>
      </div>
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleQuantity = (dir) => {
    // Safely trigger haptic feedback if available
    if (WebApp?.HapticFeedback?.impactOccurred) {
      WebApp.HapticFeedback.impactOccurred('light')
    }
    
    setFormData(prev => ({
      ...prev,
      quantity: dir === 'up' ? prev.quantity + 1 : Math.max(1, prev.quantity - 1)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate
    if (!formData.phone || !formData.address) {
      if (WebApp?.showAlert) {
        WebApp.showAlert('Please fill in your phone number and address.')
      } else {
        alert('Please fill in your phone number and address.')
      }
      return
    }

    try {
      setIsSubmitting(true)
      if (WebApp?.HapticFeedback?.impactOccurred) {
        WebApp.HapticFeedback.impactOccurred('medium') // Premium feel
      }

      // Get Telegram user info and extract encrypted product deep link
      const userTgId = WebApp.initDataUnsafe?.user?.id || 0
      const startParam = WebApp.initDataUnsafe?.start_param || ''
      
      let productName = 'Unknown Product'
      if (startParam && startParam !== 'Unknown_Product') {
        try {
          // Decode URLSafe Base64 to properly support Amharic and Emojis
          let b64 = startParam.replace(/-/g, '+').replace(/_/g, '/')
          while (b64.length % 4 !== 0) b64 += '='
          
          const binString = atob(b64)
          const bytes = new Uint8Array(binString.length)
          for (let i = 0; i < binString.length; i++) {
              bytes[i] = binString.charCodeAt(i)
          }
          productName = new TextDecoder('utf-8').decode(bytes)
        } catch (e) {
          productName = startParam // Fallback to raw param
        }
      }
      
      const finalNotes = formData.notes 
        ? `[Product: ${productName}] ${formData.notes}`
        : `[Product: ${productName}]`

      // In production, we actually insert to Supabase
      const { error } = await supabase.from('orders').insert({
        user_tg_id: userTgId,
        phone: formData.phone,
        address: formData.address,
        quantity: formData.quantity,
        notes: finalNotes,
        status: 'pending'
      })

      if (error && supabaseKey !== 'dummy_key') {
         console.error(error)
         throw error
      }

      // Success
      if (WebApp?.HapticFeedback?.notificationOccurred) {
        WebApp.HapticFeedback.notificationOccurred('success')
      }
      setIsSuccess(true)
      
      // Close WebApp smoothly after a delay
      setTimeout(() => {
        if (WebApp?.close) {
          WebApp.close()
        }
      }, 3000)

    } catch (error) {
       if (WebApp?.HapticFeedback?.notificationOccurred) {
         WebApp.HapticFeedback.notificationOccurred('error')
       }
       if (WebApp?.showAlert) {
         WebApp.showAlert(`Error submitting order: ${error.message || 'Unknown error'}`)
       } else {
         alert(`Error submitting order: ${error.message || 'Unknown error'}`)
       }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground animate-in fade-in duration-500">
        <div className="glass p-8 rounded-2xl flex flex-col items-center max-w-sm mx-auto text-center border-emerald-500/20 shadow-emerald-500/10 shadow-2xl">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-emerald-300 to-emerald-600 mb-2">
            Order Confirmed!
          </h2>
          <p className="text-muted-foreground">
            We've received your order. You can close this window now.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8 glass p-6 sm:p-8 rounded-3xl relative overflow-hidden">
        
        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-3 mb-8 relative z-10 border-b border-border/50 pb-6">
          <div className="p-3 bg-primary/10 rounded-xl">
             <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground m-0">Secure Checkout</h1>
            <p className="text-sm text-muted-foreground m-0">Express delivery within minutes</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10 text-left">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">Phone Number</label>
            <input 
              type="tel" 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0941..."
              pattern="^0[79]\d{8}$"
              title="Please enter a valid Ethiopian phone number starting with 09 or 07"
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">Delivery Address</label>
            <textarea 
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Building name, street, exact location..."
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner resize-none h-24"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">Quantity</label>
            <div className="flex items-center space-x-4 bg-input/30 w-full p-2 rounded-xl border border-border">
              <button 
                type="button" 
                onClick={() => handleQuantity('down')}
                className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-secondary active:scale-95 transition-all text-xl"
              >-</button>
              <span className="flex-1 text-center font-bold text-lg">{formData.quantity}</span>
              <button 
                type="button" 
                onClick={() => handleQuantity('up')}
                className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-secondary active:scale-95 transition-all text-xl"
              >+</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground ml-1">Special Notes (Optional)</label>
            <input 
              type="text" 
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any specific delivery instructions?"
              className="w-full bg-input/20 border border-border/60 rounded-xl px-4 py-3 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner text-sm"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full relative overflow-hidden group mt-8 bg-foreground text-background font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] ${isSubmitting ? 'opacity-80' : 'hover:shadow-primary/25 hover:-translate-y-0.5'}`}
          >
            <span className={`flex items-center justify-center space-x-2 ${isSubmitting ? 'invisible' : 'visible'}`}>
              <span>Place Order</span>
            </span>
            {isSubmitting && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out z-10" />
          </button>

        </form>
      </div>
    </div>
  )
}

export default App
