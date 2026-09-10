# KisanSetu — Mobile (Flutter)

The mobile app isn't scaffolded with generated boilerplate in this repo (Flutter's
`flutter create` output is large and machine-specific), but here's exactly how to
stand it up so it talks to the same backend as the web dashboard.

## 1. Prerequisites
- Flutter SDK 3.19+ (`flutter doctor` should be clean)
- Android Studio / an Android device or emulator

## 2. Scaffold the app
From this `mobile/` folder:
```bash
flutter create kisansetu_app
cd kisansetu_app
```

## 3. Recommended packages
```bash
flutter pub add http dio supabase_flutter flutter_riverpod go_router
flutter pub add record just_audio          # for voice recording/playback (BHASHINI flow)
flutter pub add flutter_dotenv
```

## 4. Project structure (mirror the web app's shape)
```
lib/
├── main.dart
├── core/
│   ├── api_client.dart       # Dio client pointed at the same FastAPI backend
│   └── config.dart           # reads .env (API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY)
├── features/
│   ├── auth/                 # phone OTP login via Supabase Auth
│   ├── farmer_dashboard/     # crop entry form + SellDecisionCard equivalent
│   ├── voice_assistant/      # mic capture -> POST /agent/voice-query -> play back audio
│   └── buyers/               # verified buyer list
└── shared/
    └── widgets/
```

## 5. Wiring to the backend
Point `API_BASE_URL` in your `.env` (loaded via `flutter_dotenv`) at:
- `http://10.0.2.2:8000` — if testing on the Android emulator against a locally-run backend
- your deployed Render/Railway URL — for a real device or shared demo

Reuse the exact same endpoints documented in [`../docs/API_ENDPOINTS.md`](../docs/API_ENDPOINTS.md) —
`/decision`, `/agent/query`, `/agent/voice-query`, `/buyers`, `/farmers`.

## 6. Voice-first flow (core differentiator — build this first)
1. Record audio with `record` package.
2. Base64-encode it, POST to `/agent/voice-query` with `{audio_base64, language}`.
3. Backend runs BHASHINI ASR → agent → BHASHINI TTS, returns `answer_audio_base64` (hex-encoded).
4. Decode and play back with `just_audio`.

This is the single most important screen for the SIH demo — a farmer who can't
type should still get the full SELL/WAIT/STORE/AGGREGATE recommendation, spoken
back in their own language.

## 7. Build & run
```bash
flutter run                 # debug, on connected device/emulator
flutter build apk --release # release APK for demo/sideloading
```
