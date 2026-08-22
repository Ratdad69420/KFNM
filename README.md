# KFNM

Watermark Studio — put text on photos and videos. Batch both in one go.

**Open in browser:** https://ratdad69420.github.io/KFNM/

Nothing is uploaded. Photos and videos export in the page. Video save plays through the clip once; most browsers download WebM.

## Windows app

1. Get `WatermarkStudio.exe` from [Releases](https://github.com/Ratdad69420/KFNM/releases).
2. Double-click it. FFmpeg is bundled. No installer.

Already have this folder? Double-click `start.bat`.

Photos and videos live in the side panel. Drop files there (or hit Add). The center shows the current file — prev/next and the arrow keys move through a list. Photos and videos each keep their own watermark (text, size, color, pattern, bounce). Hit **Export all**. Every queued file goes to your Downloads folder as `name_watermarked.jpg` / `.png` / `.mp4`.

## Browser

1. Open https://ratdad69420.github.io/KFNM/
2. Add photos and/or videos from the side
3. Export all — every photo and video downloads into your Downloads folder, one after another

Works in desktop Chrome, Edge, Firefox, and Android Chrome. iOS Safari may not record video in the page.

## From source

```bat
npm install
npm start
```

```bat
npm run build
```

Portable exe lands in `dist/WatermarkStudio.exe`.
