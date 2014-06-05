SocketIOBinaryTest
==================

Playing around Socket.IO's new binary feature.

------
## What I did:
1. Browser
 * Capture microphone input via getUM and WAAPI (sampleRate = 44100Hz, sampleLen = 16bit, mono, buffer size = 4096 samples.)
 * Send the data (ArrayBuffer) via Socket.IO (the event happens 10.766 times per second, each message is 8KByte, totalBitRate is about 689Kbit.)
2. Node
 * Receive each data as a Buffer.
 * Concat them into a WAVE file.
