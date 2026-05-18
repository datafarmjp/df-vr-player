# DF VR Player

DF VR Player is a Mac desktop app for viewing VR180 and VR360 video files.

It can open videos from local storage, external drives, and NAS locations that are visible in Finder.

## Development

```bash
npm install
npm run dev
```

## Features

- Open `.mp4`, `.mov`, `.m4v`, and `.webm` videos
- VR180 / VR360 viewing with Three.js
- 2D, SBS, and Top-Bottom projection modes
- Automatic projection mode guessing from file names and video size
- Mouse drag view control
- Wheel / trackpad zoom
- Playback, seek, and volume controls
- Left-eye / right-eye preview for 3D videos
- Horizontal / vertical flip controls
- Video history with thumbnails
- Per-file aliases and alias CSV export

## Notes

NAS videos are supported when they are accessible through Finder, just like regular files.

For best compatibility, H.264 MP4 files are recommended. HEVC/H.265 playback depends on macOS and Electron/Chromium support.
