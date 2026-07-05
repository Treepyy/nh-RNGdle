// app/api/roll/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const randomId = Math.floor(Math.random() * 661547) + 1;
  // for testing
  // const randomId = 533649

  try {
    const res = await fetch(`https://nhentai.net/api/v2/galleries/${randomId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      // Returning status 200 prevents Next.js from overriding the response with a 404 HTML page.
      // The client will see success: false and automatically retry.
      return NextResponse.json({ success: false, error: 'Gallery not found' }, { status: 200 });
    }

    // Read as text first to prevent JSON parse errors if Cloudflare intercepts the request
    const text = await res.text();
    // console.log(text)
    
    try {
      const data = JSON.parse(text);
      
      const extractedTags = data.tags
        .filter((t: any) => t.type === 'tag') 
        .map((t: any) => t.name);

      return NextResponse.json({ 
        success: true, 
        id: randomId, 
        title: data.title?.english || data.title?.japanese || 'Unknown',
        tags: extractedTags 
      }, { status: 200 });

    } catch (parseError) {
      // If parsing fails, nHentai likely returned a Cloudflare Captcha HTML page
      return NextResponse.json({ success: false, error: 'Cloudflare challenge hit' }, { status: 200 });
    }

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server fetch failed' }, { status: 200 });
  }
}