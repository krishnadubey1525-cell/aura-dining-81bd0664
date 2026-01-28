import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW_MS = 60 * 1000; // 1 minute window

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  // Clean up old entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  if (!record || record.resetTime < now) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting based on IP or fallback to anonymous
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("x-real-ip") || 
                   "anonymous";
  
  if (!checkRateLimit(clientIP)) {
    return new Response(JSON.stringify({ 
      error: "Too many requests. Please wait a moment before trying again." 
    }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, action, reservationData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Handle reservation booking action
    if (action === "book_reservation") {
      const { name, phone, email, date, time, party_size, notes } = reservationData;
      
      const { data, error } = await supabase
        .from("reservations")
        .insert([{ name, phone, email, date, time, party_size, notes, status: "pending" }])
        .select()
        .single();
      
      if (error) {
        console.error("Reservation error:", error);
        return new Response(JSON.stringify({ error: "Failed to create reservation", details: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ success: true, reservation: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch menu items for context
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("name, description, price, tags, allergens, is_available, category_id")
      .eq("is_visible", true);

    const { data: categories } = await supabase
      .from("menu_categories")
      .select("id, name")
      .order("sort_order");

    // Build menu context
    const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);
    const menuContext = menuItems?.map(item => ({
      name: item.name,
      description: item.description,
      price: `$${item.price}`,
      category: categoryMap.get(item.category_id) || "Uncategorized",
      tags: item.tags?.join(", ") || "",
      allergens: item.allergens?.join(", ") || "None",
      available: item.is_available
    })) || [];

    const menuDescription = menuContext.map(item => 
      `- ${item.name} (${item.category}, ${item.price}): ${item.description || "No description"}${item.tags ? ` [${item.tags}]` : ""}${item.allergens !== "None" ? ` Allergens: ${item.allergens}` : ""}${!item.available ? " [UNAVAILABLE]" : ""}`
    ).join("\n");

    const systemPrompt = `You are a friendly and helpful AI assistant for Lumière, an upscale French-inspired restaurant. 

Your role is to:
- Answer questions about our menu, including dishes, ingredients, and dietary accommodations
- Help with reservations by collecting guest information
- Describe our ambiance and what guests can expect
- Recommend dishes based on preferences (vegetarian, gluten-free, etc.)
- Provide information about private dining and special events

Restaurant Details:
- Name: Lumière
- Cuisine: Modern French-inspired fine dining
- Ambiance: Elegant, romantic, sophisticated with warm lighting
- Location: Downtown
- Hours: Tuesday-Sunday, 5:00 PM - 10:00 PM (Closed Mondays)

## CURRENT MENU:
${menuDescription || "Menu is currently being updated. Please ask about our daily specials."}

## RESERVATION BOOKING:
When a guest wants to make a reservation, you MUST collect ALL of the following information before confirming:
1. Name (required)
2. Phone number (required)
3. Date (required - format: YYYY-MM-DD)
4. Time (required - format: HH:MM, between 17:00 and 22:00)
5. Party size (required - number of guests)
6. Email (optional)
7. Special requests/notes (optional)

Once you have collected ALL required information, respond with EXACTLY this format on a new line:
[RESERVATION_DATA]{"name":"Guest Name","phone":"1234567890","email":"email@example.com","date":"2024-12-25","time":"19:00","party_size":2,"notes":"any special requests"}[/RESERVATION_DATA]

Important booking rules:
- We are closed on Mondays
- Reservations are from 5:00 PM (17:00) to 10:00 PM (22:00)
- Maximum party size is 12 guests
- For parties larger than 8, mention our private dining room

Keep responses warm, professional, and concise. Use a touch of French flair when appropriate (e.g., "Bon appétit!").`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "We're experiencing high demand. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Unable to process your request" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
