import { createClient } from '@supabase/supabase-js';

// Hero project
const HERO_SUPABASE_URL =  'https://lrxkakilyythtkpzmmqo.supabase.co'; // <-- hizircha !!!
const HERO_SUPABASE_KEY ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyeGtha2lseXl0aHRrcHptbXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4Njg5NTIsImV4cCI6MjA2OTQ0NDk1Mn0.3xan0pOurVnB-cuLgwT4lyOKL14w-d_OiUQvpQ3sfnY'; // <-- o'z anon key'ingizni yozing

export const heroSupabase = createClient(HERO_SUPABASE_URL, HERO_SUPABASE_KEY);

// Artifact project
const ARTIFACT_SUPABASE_URL = "https://yvuxspfineghfyzoztng.supabase.co";
const ARTIFACT_SUPABASE_KEY = "artifact-project-anon-key";
export const artifactSupabase = createClient(ARTIFACT_SUPABASE_URL, ARTIFACT_SUPABASE_KEY);