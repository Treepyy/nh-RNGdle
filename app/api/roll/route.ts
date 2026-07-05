// app/api/roll/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const randomId = Math.floor(Math.random() * 661547) + 1;
  // for testing: 533649, 177013
  // const randomId = 177013

  try {
    const res = await fetch(`https://nhentai.net/api/v2/galleries/${randomId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      // NOW INCLUDES THE ID AND is404 FLAG
      return NextResponse.json({ success: false, is404: true, id: randomId, error: 'Gallery not found' }, { status: 200 });
    }

    const text = await res.text();
    
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
      return NextResponse.json({ success: false, error: 'Cloudflare challenge hit' }, { status: 200 });
    }

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server fetch failed' }, { status: 200 });
  }
}