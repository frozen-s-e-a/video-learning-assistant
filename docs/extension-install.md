# Extension Install

1. Open Chrome or Edge.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable developer mode.
4. Click "Load unpacked".
5. Select the `extension` directory.
6. Open the extension options page.
7. Set the backend URL, access token, provider, and model.
8. Open a Bilibili or YouTube tutorial video.
9. Pause the video.
10. Click "Analyze current frame".
11. To analyze only part of the frame, open the side panel and click "Select region and analyze".

The first version stores recent analysis history only in browser local storage and does not store screenshots by default.

Follow-up questions work with the fake provider. Real provider shells are listed only when their API keys are configured, but provider API calls are not implemented yet and return `PROVIDER_NOT_IMPLEMENTED`.
