# BizWork (React + Supabase)

Ntirageragezwa kuri Supabase nyakuri. Itegereje ko ukora `npm install` ukabona amakosa (nimba ahari).

## Gukora kuri laptop
1. Shiraho Node.js (nodejs.org)
2. `npm install`
3. `npm run dev` hanyuma ufungure link ibonetse.

`.env` irimwo URL na publishable key ya project yawe (nta banga).

## Gushyira kuri internet (Vercel canke Netlify)
- Command: `npm run build`, Folder: `dist`
- Environment variables: VITE_SUPABASE_URL na VITE_SUPABASE_PUBLISHABLE_KEY

## Muri Supabase (Authentication > URL Configuration)
- Site URL: link ya app yawe nyuma yo kuyishira kuri internet
- Redirect URLs: ongeraho iyo link imwe

## Ibiracakenewe
- Google login: Authentication > Providers > Google (bisaba Google Cloud OAuth credentials)
- Phone OTP: Authentication > Providers > Phone (bisaba Twilio canke indi SMS provider yishyurwa)
- Message: ntirahari (button irazimye)
- Camera isaba HTTPS (ikora kuri localhost no kuri Vercel/Netlify)
