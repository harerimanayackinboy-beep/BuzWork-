import { createClient } from '@supabase/supabase-js'

// Umuzinga wa BuzRider (delivery), utandukanye na BizWork ubwayo -- BizWork
// irungika gusa delivery_request kuri uyu mubiko, ntabwo ikoresha konti imwe
// n'iy'umukoresha (auth) kuko BuzRider ifise users bwayo bwite.
export const supabaseRider = createClient(
  import.meta.env.VITE_BUZRIDER_URL,
  import.meta.env.VITE_BUZRIDER_PUBLISHABLE_KEY
)
