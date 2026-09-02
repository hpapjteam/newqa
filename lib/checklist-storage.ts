import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface ChecklistItem {
  id: string;
  text: string;
  stage?: number;
  requiresInput?: boolean;
  inputPlaceholder?: string;
  description?: string;
  options?: string[];
}

export interface TeamChecklist {
  id?: string;
  team: string;
  name?: string;
  items: ChecklistItem[];
}

export const DEFAULT_PLATFORM_CHECKLISTS: TeamChecklist[] = [
  {
    id: "apj-fqa",
    team: "HP-APJ",
    name: "FQA Checklist",
    items: [
      { id: "apj-content-1", text: "1. Content - Functional tracking links with no error catcher in links - Full UTM parameters, %20%, HP Logo etc.", stage: 0 },
      { id: "apj-content-2", text: "1. Content - ALT Text and Alias assigned with unique labels", stage: 0 },
      { id: "apj-content-3", text: "1. Content - Grammar, Spelling and Image check: Subject line, Preheader, Email Body", stage: 0 },
      { id: "apj-content-4", text: "1. Content - Cross-check dual-language content", stage: 0 },
      { id: "apj-content-5", text: "1. Content - CTA: Correct links to intended country landing pages/phone number", stage: 0 },
      { id: "apj-content-6", text: "1. Content - Pricing & Discounts matches to landing page", stage: 0 },
      { id: "apj-content-7", text: "1. Content - Images cross-check: Accurate violator callout, dual images, pixelated etc", stage: 0 },
      { id: "apj-content-8", text: "1. Content - Products availability on landing page", stage: 0 },
      { id: "apj-content-9", text: "1. Content - Overall Terms and Condition details (HP Benefits not required in FQA)", stage: 0 },
      { id: "apj-content-10", text: "1. Content - Unsubscribe link", stage: 0 },
      { id: "apj-content-11", text: "1. Content - Feedback and required amendments are updated", stage: 0 },
      { id: "apj-content-12", text: "1. Content - Coupons are functional on store", stage: 0 },
      { id: "apj-plat-1", text: "2. Platform - Litmus & group email check", stage: 0 },
      { id: "apj-sched-1", text: "3. Schedule - Seedlist Deployment (15 minutes before)", stage: 0 },
      { id: "apj-sched-2", text: "3. Schedule - Correct Sender Profile as per country", stage: 0 },
      { id: "apj-sched-3", text: "3. Schedule - Correct DeliveryProfile as per country", stage: 0 },
      { id: "apj-sched-4", text: "3. Schedule - Scheduled campaign is parked in the correct tracking folder", stage: 0 },
      { id: "apj-sched-5", text: "3. Schedule - Check Deployment Date & Time is accurate as per brief", stage: 0 },
      { id: "apj-dep-1", text: "4. Deployment - After the schedule add Data Extension names from the brief here", stage: 0, requiresInput: true, inputPlaceholder: "Data Extension names" },
      { id: "apj-dep-2", text: "4. Deployment - After the schedule add Data Extension names from the tracking folder here", stage: 0, requiresInput: true, inputPlaceholder: "Data Extension names" },
      { id: "apj-dep-3", text: "4. Deployment - After the schedule add Exclusions List name from the brief here", stage: 0, requiresInput: true, inputPlaceholder: "Exclusions List name" },
      { id: "apj-dep-4", text: "4. Deployment - After the schedule add Exclusions List from the tracking folder here", stage: 0, requiresInput: true, inputPlaceholder: "Exclusions List name" },
      { id: "apj-dep-5", text: "4. Deployment - After the schedule add campaign name from the brief here", stage: 0, requiresInput: true, inputPlaceholder: "Campaign name" },
      { id: "apj-dep-6", text: "4. Deployment - After the schedule add campaign name from the tracking folder here", stage: 0, requiresInput: true, inputPlaceholder: "Campaign name" },
      { id: "apj-dep-7", text: "4. Deployment - Throttle required? Check brief if throttle required", stage: 0 },
      { id: "apj-dep-8", text: "4. Deployment - Notify leads on scheduled campaign", stage: 0 }
    ]
  },
  {
    id: "apj-cqa",
    team: "HP-APJ",
    name: "CQA Checklist",
    items: [
      { id: "apj-cqa-brief-1", text: "1. Brief - Compare the eDM content against the Figma design - including assets provided in folders.", stage: 0 },
      { id: "apj-cqa-brief-2", text: "1. Brief - Compare text dimensions, padding, and spacing against the XD/Figma design specifications", stage: 0 },
      { id: "apj-cqa-brief-3", text: "1. Brief - Crosscheck setup details", stage: 0 },
      { id: "apj-cqa-brief-4", text: "1. Brief - Ensure campaign email request have been reviewed for additional instructions.", stage: 0 },
      { id: "apj-cqa-sfmc-1", text: "2. SFMC - Correct AMPscript Block and/or Error Catcher", stage: 0 },
      { id: "apj-cqa-sfmc-2", text: "2. SFMC - Dynamic script included with AmpScript conditions in Content", stage: 0 },
      { id: "apj-cqa-sfmc-3", text: "2. SFMC - Coupon code implemented in AMPscript", stage: 0 },
      { id: "apj-cqa-content-1", text: "3. Content - Functional tracking links with no error catcher in links - Full UTM parameters, %20%, HP Logo etc.", stage: 0 },
      { id: "apj-cqa-content-2", text: "3. Content - Check if all links have been placed into all URLs and HREFs in all modules", stage: 0 },
      { id: "apj-cqa-content-3", text: "3. Content - ALT Text and Alias assigned with unique labels", stage: 0 },
      { id: "apj-cqa-content-4", text: "3. Content - Subject Line, Pre-header & Email Body personalization script", stage: 0 },
      { id: "apj-cqa-content-5", text: "3. Content - Grammar, Spelling and Image check: Subject line, Preheader, Email Body", stage: 0 },
      { id: "apj-cqa-content-6", text: "3. Content - Cross-check dual-language content", stage: 0 },
      { id: "apj-cqa-content-7", text: "3. Content - CTA: Correct links to intended country landing pages/phone number", stage: 0 },
      { id: "apj-cqa-content-8", text: "3. Content - ASCII characters are rendering properly", stage: 0 },
      { id: "apj-cqa-content-9", text: "3. Content - Pricing & Discounts matches to landing page", stage: 0 },
      { id: "apj-cqa-content-10", text: "3. Content - Products availability on landing page", stage: 0 },
      { id: "apj-cqa-content-11", text: "3. Content - Overall Terms and Condition (full QA) / HP Benefit details", stage: 0 },
      { id: "apj-cqa-plat-1", text: "4. Platform - Litmus & group email check", stage: 0 },
      { id: "apj-cqa-plat-2", text: "4. Platform - Webview Outlook Preview", stage: 0 },
      { id: "apj-cqa-plat-3", text: "4. Platform - Verify mobile version on desktop", stage: 0 },
      { id: "apj-cqa-adhoc-1", text: "5. Other Adhoc Checks - Germany - [DE] Include Price Guarantee and Paypal Module", stage: 0 },
      { id: "apj-cqa-adhoc-2", text: "5. Other Adhoc Checks - French (BEFR, FRFR, CHFR) - there should be a space before ':', '!', '%' and '?'", stage: 0 },
      { id: "apj-cqa-adhoc-3", text: "5. Other Adhoc Checks - Japan - Web view text as Web版を表示 which was recently updated", stage: 0 },
      { id: "apj-cqa-adhoc-4", text: "5. Other Adhoc Checks - Hong Kong - Ensure <ADV> is added to the front of the Subject Line for all campaigns", stage: 0 }
    ]
  },
  {
    id: "apj-oft",
    team: "HP-APJ",
    name: "OFT Checklist",
    items: [
      { id: "apj-oft-1", text: "Campaign Name in Campaign Brief", stage: 0 },
      { id: "apj-oft-2", text: "Check Subject Line", stage: 0 },
      { id: "apj-oft-3", text: "Pre-header", stage: 0 },
      { id: "apj-oft-4", text: "utm_source applied for all the links (Public/Private) instead of %%=v(@tracking)=%%", stage: 0 },
      { id: "apj-oft-5", text: "Check if all the ampscript is removed", stage: 0 },
      { id: "apj-oft-6", text: "Remove promo codes if any", stage: 0 },
      { id: "apj-oft-7", text: "Check if all the web view is removed", stage: 0 },
      { id: "apj-oft-8", text: "Remove unsub", stage: 0 },
      { id: "apj-oft-9", text: "Hard code date in footer", stage: 0 },
      { id: "apj-oft-10", text: "Remove crm-ccm.ap.ipg@newsgram.hp.com", stage: 0 },
      { id: "apj-oft-11", text: "Compare Content Text with Translation Document", stage: 0 },
      { id: "apj-oft-12", text: "Check the product prices", stage: 0 },
      { id: "apj-oft-13", text: "All Products are available on the landing page(NO OOS)", stage: 0 },
      { id: "apj-oft-14", text: "Check All Coupons are Live (IF ANY)", stage: 0 },
      { id: "apj-oft-15", text: "Remove <custom name=\"opencounter\" type=\"tracking\"/>", stage: 0 },
      { id: "apj-oft-16", text: "Links match and go to correct promo pages with UTM", stage: 0 },
      { id: "apj-oft-17", text: "Check if Ptags are moved to the end of the link where necessary", stage: 0 },
      { id: "apj-oft-18", text: "Check footers and HP Benefits are matching the version", stage: 0 },
      { id: "apj-oft-19", text: "Check Background colours once for eDM.", stage: 0 },
      { id: "apj-oft-20", text: "Images are rendering properly", stage: 0 },
      { id: "apj-oft-21", text: "Remove redirect,concat and additional quotes/symbols and add UTM as utm_source=newsletter&utm_medium=email&utm_campaign=ols_xx_xx_qxxx_campaignname", stage: 0 },
      { id: "apj-oft-22", text: "Check if p tag is removed and included in th tag for the footer's<!-- Single row links -->( laptop, desktops ,printers, Monitors, Ink & Toners and Support) section and padding added instead of margin", stage: 0 },
      { id: "apj-oft-23", text: "Check if all the styling block tables were removed", stage: 0 },
      { id: "apj-oft-24", text: "Check alt & alias's tags and there are no duplicates and &(amp) make 'and'.", stage: 0 },
      { id: "apj-oft-25", text: "English version: grammar OK Spellings and Widow words in the Edm", stage: 0 },
      { id: "apj-oft-26", text: "All versions: punctuation, periods, commas not linked", stage: 0 },
      { id: "apj-oft-27", text: "check if any phone number included clickable in eDM and verify in store page", stage: 0 },
      { id: "apj-oft-28", text: "All versions: ASCII characters are rendering properly", stage: 0 },
      { id: "apj-oft-29", text: "General view on template in mobiles in your team to check rendering issues if any", stage: 0 },
      { id: "apj-oft-30", text: "CQA APPROVED", stage: 0 }
    ]
  },
  {
    id: "emea-default",
    team: "HP-EMEA",
    name: "Default Checklist",
    items: [
      { id: "3", text: "Ensure GDPR compliance points are met", stage: 0 },
      { id: "4", text: "Verify EMEA pricing formats", stage: 0 }
    ]
  },
  {
    team: "HP-AMS",
    items: [
      { id: "5", text: "Verify FTC and disclaimers for North America", stage: 0 },
      { id: "6", text: "Check French-Canadian translation if CA", stage: 0 }
    ]
  }
];

/**
 * Fetches platform master checklists across all teams.
 * Synchronizes directly with Supabase 'checklists' table.
 */
let inMemoryChecklists: TeamChecklist[] = DEFAULT_PLATFORM_CHECKLISTS;

export async function fetchPlatformChecklists(): Promise<TeamChecklist[]> {
  const isDb = isSupabaseConfigured();

  if (isDb) {
    try {
      const { data: templatesData, error: tError } = await supabase.from('checklist_templates').select('*');
      if (tError) throw tError;

      const { data: pointsData, error: pError } = await supabase.from('checkpoints').select('*').order('created_at', { ascending: true });
      if (pError) throw pError;

      if (templatesData && templatesData.length > 0) {
        const loaded: TeamChecklist[] = templatesData.map((t: any) => {
          const tPoints = pointsData?.filter((p: any) => p.template_id === t.id) || [];
          return {
            id: t.id,
            team: t.team,
            name: t.name,
            items: tPoints.map((p: any) => {
              let options = undefined;
              let inputPlaceholder = p.input_placeholder;
              if (inputPlaceholder && inputPlaceholder.startsWith('__OPTIONS__:')) {
                try {
                  options = JSON.parse(inputPlaceholder.substring(12));
                  inputPlaceholder = undefined;
                } catch(e) {}
              }
              return {
                id: p.id,
                text: p.text,
                stage: p.stage,
                requiresInput: p.requires_input,
                inputPlaceholder,
                options
              };
            })
          };
        });
        inMemoryChecklists = loaded.length > 0 ? loaded : DEFAULT_PLATFORM_CHECKLISTS;
        return inMemoryChecklists;
      }
    } catch (e) {
      console.warn("[ChecklistStorage] Error loading from Supabase:", e);
    }
  }

  // Server API fallback
  try {
    const res = await fetch('/api/checklists');
    if (res.ok) {
      const json = await res.json();
      if (json.checklists && Array.isArray(json.checklists)) {
        inMemoryChecklists = json.checklists;
        return inMemoryChecklists;
      }
    }
  } catch (apiErr) {}

  // If DB is configured but had no records, auto-seed DB with default checklists
  if (isDb) {
    await savePlatformChecklists(DEFAULT_PLATFORM_CHECKLISTS);
  }

  return inMemoryChecklists;
}

/**
 * Saves platform master checklists to Supabase.
 */
export async function savePlatformChecklists(checklists: TeamChecklist[]): Promise<void> {
  inMemoryChecklists = checklists;
  const isDb = isSupabaseConfigured();

  if (isDb) {
    try {
      for (const t of checklists) {
        // Upsert template
        const { error: tError } = await supabase.from('checklist_templates').upsert([{
          id: t.id || `${t.team}-${t.name}`.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          team: t.team,
          name: t.name || 'Default Checklist'
        }], { onConflict: 'id' });
        
        if (tError) {
          console.warn(`[ChecklistStorage] Error saving template ${t.name}:`, tError);
          continue;
        }

        // To cleanly handle checkpoint deletes/edits, we just wipe the template's checkpoints and re-insert
        // Since we have ON DELETE CASCADE, we wouldn't delete the template itself, just the children
        const templateId = t.id || `${t.team}-${t.name}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        await supabase.from('checkpoints').delete().eq('template_id', templateId);
        
        if (t.items && t.items.length > 0) {
          const insertPayload = t.items.map(p => {
            let placeholder = p.inputPlaceholder || null;
            if (p.options && p.options.length > 0) {
              placeholder = `__OPTIONS__:${JSON.stringify(p.options)}`;
            }
            return {
              id: p.id,
              template_id: templateId,
              text: p.text,
              stage: p.stage || 0,
              requires_input: p.requiresInput || false,
              input_placeholder: placeholder
            };
          });
          
          const { error: pError } = await supabase.from('checkpoints').insert(insertPayload);
          if (pError) console.warn(`[ChecklistStorage] Error saving checkpoints for ${t.name}:`, pError);
        }
      }
    } catch (e) {
      console.warn("[ChecklistStorage] Supabase save error:", e);
    }
  }
}
