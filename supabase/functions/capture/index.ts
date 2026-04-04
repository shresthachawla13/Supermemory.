import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CaptureRequest {
  url: string;
  title: string;
  text: string;
  metadata?: Record<string, unknown>;
}

interface OpenAIMessage {
  role: string;
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

interface ContentAnalysis {
  summary: string;
  keywords: string[];
  topics: string[];
  content_type: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { url, title, text, metadata = {} }: CaptureRequest = await req.json();

    if (!url || !title || !text) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: url, title, text" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: existing } = await supabase
      .from("content_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("url", url)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          message: "Content already saved",
          id: existing.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const truncatedText = text.slice(0, 3000);

    const analysisPrompt = `You are a content analysis assistant. Given the following web content, extract:
1. A 2-sentence plain-language summary of what this content is about
2. A list of 5-8 relevant keywords
3. 1-3 main topic categories
4. The content type (one of: article, video, tweet, thread, reel, other)

Title: ${title}
Content: ${truncatedText}

Return ONLY valid JSON with this exact structure:
{
  "summary": "two sentence summary here",
  "keywords": ["keyword1", "keyword2", ...],
  "topics": ["topic1", "topic2"],
  "content_type": "article"
}`;

    const analysisResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "user", content: analysisPrompt } as OpenAIMessage,
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      }
    );

    if (!analysisResponse.ok) {
      throw new Error(`OpenAI API error: ${analysisResponse.statusText}`);
    }

    const analysisData: OpenAIResponse = await analysisResponse.json();
    const analysisText = analysisData.choices[0].message.content;

    let analysis: ContentAnalysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      analysis = {
        summary: "Failed to parse content analysis",
        keywords: [],
        topics: [],
        content_type: "other",
      };
    }

    const embeddingText = `${title}\n\n${analysis.summary}\n\n${truncatedText}`;

    const embeddingResponse = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: embeddingText,
        }),
      }
    );

    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI Embeddings API error: ${embeddingResponse.statusText}`);
    }

    const embeddingData: OpenAIEmbeddingResponse = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    const { data: contentItem, error: insertError } = await supabase
      .from("content_items")
      .insert({
        user_id: user.id,
        url,
        title,
        original_text: text,
        summary: analysis.summary,
        keywords: analysis.keywords,
        topics: analysis.topics,
        content_type: analysis.content_type,
        embedding: JSON.stringify(embedding),
        status: "processed",
        metadata,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: contentItem.id,
        summary: analysis.summary,
        keywords: analysis.keywords,
        topics: analysis.topics,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Capture error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
