# Beacon App Context

## Overview
Beacon is an Android safety app (Kotlin, XML Views) focused on:
- SOS activation with live location sharing
- Incident reporting
- Broadcast alert inbox and acknowledgement
- Emergency contacts and friend network
- Map/tracking views for active SOS sessions

The app uses Firebase for auth/messaging/firestore and a separate REST backend (Retrofit) for user/contact/friend/SOS/broadcast/incident APIs.

## Tech Stack
- Language: Kotlin
- UI: Android Views + ViewBinding + Fragments + Navigation Component
- Architecture style: Feature-oriented MVVM-ish (Fragments + ViewModels + Repositories)
- Networking: Retrofit + Gson + OkHttp
- Auth: Firebase Authentication
- Push: Firebase Cloud Messaging
- Realtime/session storage: Firebase Firestore
- Maps: MapLibre + MapTiler style URL

## High-Level App Flow
1. `SplashActivity`
- Reads `BeaconPrefs.FIRST_LAUNCH`
- Routes to onboarding, login, or main app

2. `OnboardingActivity`
- 3 pager screens (SOS, Report, Alerts)
- Marks `FIRST_LAUNCH=false`

3. Auth (`LoginActivity`, `SignupActivity`, `ForgotPasswordActivity`)
- Firebase login/signup/password reset
- On login/signup, obtains Firebase ID token
- Calls backend `/me`, `/me/bootstrap`, `/devices/register`

4. `MainActivity`
- Hosts `NavHostFragment`
- Bottom nav: Home, Map, Report, Alerts, Profile
- Requests location + notification permission
- Handles push intent routing for SOS and broadcast alerts

## Navigation Graph (Core Destinations)
- `nav_home` -> `HomeFragment`
- `nav_map` -> `MapFragment`
- `nav_report` -> `ReportFragment`
- `nav_alerts` -> `AlertsFragment`
- `nav_profile` -> `ProfileFragment`
- Additional flows: contacts, friends, SOS activation/context/tracking/details, edit profile

## Feature Modules

### SOS
- `HomeFragment` + `SosStateMachine`: hold-to-trigger (3s countdown)
- `SosViewModel`:
  - Sends SOS once to backend (`/sos`) for push fanout
  - Creates and updates Firestore `sos_sessions` every 10s while active
  - Supports context (`GENERAL`, etc.) and cancellation
- `SosActivationFragment` -> `SosContextFragment` -> `TrackingFragment`
- `SosDetailsFragment` supports read-only SOS details from push and can subscribe to live Firestore session updates

### Map
- `MapFragment` (MapLibre):
  - Shows user location (when permission granted)
  - Loads active SOS markers from Firestore `sos_sessions`
  - Supports opening Google Maps navigation for SOS markers
  - Handles SOS marker arguments from notification payload

### Report
- `ReportFragment`:
  - Submits incident reports to backend `/incidents`
  - Optional location capture + reverse geocode
  - Optional image attach, JPEG compression, base64 data URI payload

### Alerts
- `BeaconMessagingService` receives FCM payloads:
  - Broadcast type: publishes in-app event + notification
  - SOS type: builds notification with SOS extras
- `AlertsViewModel` + `BroadcastRepository`:
  - Fetch broadcast inbox (`/admin/broadcasts/my/inbox`)
  - Acknowledge broadcast (`/admin/broadcasts/{id}/ack`) with retry
  - Severity filtering in UI

### Contacts
- `ContactsViewModel` + `ContactRepository`:
  - CRUD via `/contacts`
  - Up to 3 primary contacts
  - Supports swapping primary contacts and guardrails to keep at least one emergency contact

### Friends
- `FriendsViewModel` + `FriendsRepository`:
  - Send/accept requests, list friends/incoming
  - Unfriend includes multiple fallback endpoint patterns for backend compatibility

### Profile
- `ProfileViewModel` + `FirebaseProfileRepository`:
  - Loads via backend `/me` (not just Firebase profile)
  - Updates Firebase profile/email and backend `/me`
- `EditProfileFragment` includes form validation and tests

## Data and Services

### REST API
- Client: `app/src/main/java/com/example/beacon/api/ApiClient.kt`
- Current `BASE_URL`: `http://192.168.1.72:3000/` (LAN/dev address)
- Auth pattern: `Authorization: Bearer <Firebase ID token>`

### Firebase Usage
- `FirebaseAuth`: session/auth state
- `FirebaseMessaging`: FCM token + message handling
- `Firestore` collections:
  - `users` (stores/merges phone number)
  - `sos_sessions` (active SOS state + location history)

## Permissions and Platform
- Manifest permissions:
  - `INTERNET`
  - `ACCESS_FINE_LOCATION`
  - `ACCESS_COARSE_LOCATION`
  - `POST_NOTIFICATIONS`
- Android SDK settings:
  - `minSdk 24`, `targetSdk 36`, `compileSdk 36`

## Build and Runtime Configuration
- `MAPTILER_API_KEY` read from `local.properties` and exposed as `BuildConfig.MAPTILER_API_KEY`
- Google services enabled (`google-services.json` present)
- `usesCleartextTraffic=true` in manifest (HTTP backend expected in current setup)

## Testing Coverage (Current)
- Unit tests mainly cover profile mapping/validation:
  - `ProfileMapperTest`
  - `EditProfileFormValidatorTest`
- No substantial automated tests observed for SOS, map, contacts, friends, alerts, or auth flows.

## Notable Risks / Technical Debt
- Hardcoded LAN backend URL (`192.168.1.72`) limits portability.
- Cleartext HTTP enabled globally.
- Multiple debug-style logs contain sensitive token-related data paths (ID token/FCM logging behavior should be reviewed before release).
- Mixed dependency/version management style (version catalog exists but many deps are hardcoded).
- Some package/file placement inconsistency (e.g., `tracking/TrackingFragment.kt` declares package `com.example.beacon.sos`), which works but increases maintenance friction.

## Useful Entry Points
- Application init: `app/src/main/java/com/example/beacon/BeaconApp.kt`
- Main shell/navigation: `app/src/main/java/com/example/beacon/MainActivity.kt`
- SOS core logic: `app/src/main/java/com/example/beacon/viewmodel/SosViewModel.kt`
- Push handling: `app/src/main/java/com/example/beacon/notifications/BeaconMessagingService.kt`
- API contract: `app/src/main/java/com/example/beacon/api/ApiService.kt`
