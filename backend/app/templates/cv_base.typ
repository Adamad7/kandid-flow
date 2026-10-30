// KandidFlow — ATS-Optimized Typst Resume Template (Single-Column)

// Read raw data from sys.inputs or fallback to empty JSON
#let raw_input = sys.inputs.at("cv_data", default: "{}")
#let cv_data = json(bytes(raw_input))

// Candidate & Contact Details
#let full_name = cv_data.at("full_name", default: cv_data.at("name", default: "Jan Kowalski"))
#let job_title = cv_data.at("job_title", default: cv_data.at("target_role", default: cv_data.at("headline", default: none)))
#let contact = cv_data.at("contact_info", default: cv_data.at("contact", default: (:)))
#let lang = cv_data.at("language", default: "pl")

// Styling & Typography Configuration
#let styling_raw = cv_data.at("styling", default: (:))
#let styling = if type(styling_raw) == dictionary { styling_raw } else { (:) }

// Style helper routines
#let get-elem-style(styling_map, key) = {
  let val = styling_map.at(key, default: (:))
  if type(val) == dictionary { val } else { (:) }
}

#let resolve-font(elem_style, fallback_family) = {
  let fallback = if fallback_family != none and fallback_family != "" { fallback_family } else { "Liberation Sans" }
  let f = elem_style.at("font_family", default: fallback)
  let chosen = if f != none and f != "" { f } else { fallback }
  
  if chosen in ("Times New Roman", "Georgia", "Liberation Serif", "DejaVu Serif", "Noto Serif") {
    (chosen, "Liberation Serif", "DejaVu Serif", "Noto Serif")
  } else if chosen in ("Courier New", "Liberation Mono", "DejaVu Sans Mono", "Noto Mono") {
    (chosen, "Liberation Mono", "DejaVu Sans Mono", "Noto Mono")
  } else if chosen in ("Inter", "Roboto", "Open Sans", "Lato", "DejaVu Sans", "Noto Sans") {
    (chosen, fallback, "Liberation Sans", "DejaVu Sans", "Noto Sans")
  } else if chosen == "Arial" {
    ("Arial", "Liberation Sans", "DejaVu Sans", "Noto Sans")
  } else {
    (chosen, fallback, "Liberation Sans", "DejaVu Sans", "Noto Sans")
  }
}

#let resolve-size(elem_style, default_pt) = {
  let s = elem_style.at("font_size_pt", default: default_pt)
  let num = if s != none { s } else { default_pt }
  float(num) * 1pt
}

#let resolve-weight(elem_style, default_weight) = {
  let w = elem_style.at("font_weight", default: default_weight)
  if w != none and w != "" { str(w) } else { default_weight }
}

// Margins
#let margin_x_val = styling.at("margin_x_cm", default: 1.8)
#let margin_y_val = styling.at("margin_y_cm", default: 1.8)
#let margin_x = float(if margin_x_val != none { margin_x_val } else { 1.8 }) * 1cm
#let margin_y = float(if margin_y_val != none { margin_y_val } else { 1.8 }) * 1cm

#set page(
  paper: "a4",
  margin: (x: margin_x, y: margin_y),
)

// Global Document & Section Typography
#let doc_font = styling.at("document_font_family", default: "Liberation Sans")
#let doc_font_fallback = if doc_font != none and doc_font != "" { doc_font } else { "Liberation Sans" }

#let sec_text_style = get-elem-style(styling, "section_text")
#let sec_text_font = resolve-font(sec_text_style, doc_font_fallback)
#let sec_text_size = resolve-size(sec_text_style, 9.5)
#let sec_text_weight = resolve-weight(sec_text_style, "regular")
#let sec_text_leading_val = styling.at("section_text_line_height_em", default: 0.65)
#let sec_text_leading = float(if sec_text_leading_val != none { sec_text_leading_val } else { 0.65 }) * 1em

#let sec_spacing_val = styling.at("section_spacing_em", default: 0.6)
#let sec_spacing = float(if sec_spacing_val != none { sec_spacing_val } else { 0.6 }) * 1em

#let heading_line_height_val = styling.at("heading_line_height_em", default: 0.65)
#let heading_line_height = float(if heading_line_height_val != none { heading_line_height_val } else { 0.65 }) * 1em
#let heading_style = get-elem-style(styling, "section_headings")
#let heading_font = resolve-font(heading_style, doc_font_fallback)
#let heading_size = resolve-size(heading_style, 11.0)
#let heading_weight = resolve-weight(heading_style, "bold")

#let full_name_style = get-elem-style(styling, "full_name")
#let full_name_font = resolve-font(full_name_style, doc_font_fallback)
#let full_name_size = resolve-size(full_name_style, 18.0)
#let full_name_weight = resolve-weight(full_name_style, "bold")

#let job_title_style = get-elem-style(styling, "job_title")
#let job_title_font = resolve-font(job_title_style, doc_font_fallback)
#let job_title_size = resolve-size(job_title_style, 11.0)
#let job_title_weight = resolve-weight(job_title_style, "semibold")

#let contact_style_raw = get-elem-style(styling, "contact_info")
#let contact_style = if contact_style_raw.len() > 0 { contact_style_raw } else { get-elem-style(styling, "contact_items") }
#let contact_font = resolve-font(contact_style, doc_font_fallback)
#let contact_size = resolve-size(contact_style, 8.5)
#let contact_weight = resolve-weight(contact_style, "regular")

#let clause_style = get-elem-style(styling, "clause")
#let clause_font = resolve-font(clause_style, doc_font_fallback)
#let clause_size = resolve-size(clause_style, 7.0)
#let clause_weight = resolve-weight(clause_style, "regular")

#set text(
  font: sec_text_font,
  size: sec_text_size,
  weight: sec_text_weight,
  lang: lang,
)
#set par(justify: true, leading: sec_text_leading)

// Localization Dictionary
#let dict = (
  pl: (
    summary: "O mnie",
    skills: "Umiejętności",
    experience: "Doświadczenie zawodowe",
    projects: "Projekty",
    education: "Edukacja",
    certificates: "Certyfikaty",
    languages: "Znajomość języków",
    trainings: "Szkolenia",
    achievements: "Osiągnięcia",
    interests: "Zainteresowania",
    present: "obecnie",
    clause: "Wyrażam zgodę na przetwarzanie moich danych osobowych dla potrzeb niezbędnych do realizacji procesu rekrutacji zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO)."
  ),
  en: (
    summary: "Professional Summary",
    skills: "Technical Skills",
    experience: "Work Experience",
    projects: "Projects",
    education: "Education",
    certificates: "Certifications",
    languages: "Languages",
    trainings: "Training & Courses",
    achievements: "Achievements",
    interests: "Interests",
    present: "Present",
    clause: "I hereby consent to my personal data being processed for the purpose of the recruitment process in accordance with the General Data Protection Regulation (EU) 2016/679 (GDPR)."
  )
)
#let i18n = dict.at(lang, default: dict.at("pl"))

// Helper for section headings
#let section-heading(title) = [
  #v(sec_spacing)
  #block[
    #set par(leading: heading_line_height)
    #text(
      font: heading_font,
      size: heading_size,
      weight: heading_weight,
      fill: rgb("#111827"),
    )[#upper(title)]
  ]
  #v(-0.4em)
  #line(length: 100%, stroke: 0.5pt + rgb("#d1d5db"))
  #v(0.2em)
]

// Format date range (e.g. 2023-01 – obecnie)
#let format-dates(start_date, end_date) = {
  if start_date != none and start_date != "" {
    let end_str = if end_date == "present" or end_date == "obecnie" or end_date == none or end_date == "" {
      i18n.present
    } else {
      str(end_date)
    }
    str(start_date) + " – " + end_str
  } else if end_date != none and end_date != "" {
    str(end_date)
  } else {
    ""
  }
}

// Build contact items list
#let contact_items = ()
#if type(contact) == dictionary {
  if contact.at("email", default: none) != none and contact.at("email") != "" {
    contact_items.push(contact.at("email"))
  }
  if contact.at("phone", default: none) != none and contact.at("phone") != "" {
    contact_items.push(contact.at("phone"))
  }
  if contact.at("location", default: none) != none and contact.at("location") != "" {
    contact_items.push(contact.at("location"))
  }
  if contact.at("linkedin", default: none) != none and contact.at("linkedin") != "" {
    contact_items.push(contact.at("linkedin"))
  }
  if contact.at("github", default: none) != none and contact.at("github") != "" {
    contact_items.push(contact.at("github"))
  }
  if contact.at("portfolio", default: none) != none and contact.at("portfolio") != "" {
    contact_items.push(contact.at("portfolio"))
  }
}

// ---------------- HEADER ----------------
#align(center)[
  #text(
    font: full_name_font,
    size: full_name_size,
    weight: full_name_weight,
    fill: rgb("#111827"),
  )[#full_name]\
  #if job_title != none and job_title != "" [
    #v(-0.2em)
    #text(
      font: job_title_font,
      size: job_title_size,
      weight: job_title_weight,
      fill: rgb("#2563eb"),
    )[#job_title]\
  ]
  #if contact_items.len() > 0 [
    #v(0.2em)
    #text(
      font: contact_font,
      size: contact_size,
      weight: contact_weight,
      fill: rgb("#4b5563"),
    )[
      #contact_items.join("  |  ")
    ]
  ]
]

#v(0.3em)

// ---------------- DYNAMIC SECTIONS ----------------
#let sections_raw = cv_data.at("sections", default: ())
#let sections = if type(sections_raw) == array { sections_raw } else { () }

#let has_clause = false

#for sec in sections [
  #let sec_type = sec.at("type", default: sec.at("id", default: "generic"))
  #let sec_title = sec.at("title", default: i18n.at(sec_type, default: upper(sec_type)))

  #if sec_type == "summary" [
    #let summary_text = sec.at("content", default: sec.at("text", default: sec.at("summary", default: "")))
    #if summary_text != "" [
      #section-heading(sec_title)
      #summary_text
    ]
  ] else if sec_type == "skills" [
    #let items = sec.at("items", default: ())
    #section-heading(sec_title)
    #if type(items) == array [
      #for item in items [
        #if type(item) == dictionary [
          #let cat = item.at("category", default: item.at("name", default: ""))
          #let skill_list = item.at("skills", default: item.at("items", default: ()))
          #let skills_str = if type(skill_list) == array { skill_list.join(", ") } else { str(skill_list) }
          #if cat != "" [
            - *#cat:* #skills_str
          ] else [
            - #skills_str
          ]
        ] else [
          - #item
        ]
      ]
    ] else if type(items) == str [
      #items
    ]
  ] else if sec_type == "experience" [
    #let items = sec.at("items", default: ())
    #section-heading(sec_title)
    #if type(items) == array [
      #for exp in items [
        #if type(exp) == dictionary [
          #let pos = exp.at("position", default: exp.at("role", default: ""))
          #let comp = exp.at("company", default: "")
          #let loc = exp.at("location", default: "")
          #let s_date = exp.at("start_date", default: "")
          #let e_date = exp.at("end_date", default: "")
          #let date_str = format-dates(s_date, e_date)
          #let highlights = exp.at("highlights", default: exp.at("description", default: ()))

          #text(weight: "bold")[#pos] #if comp != "" [| #text(fill: rgb("#374151"))[#comp]] #if loc != "" [| #text(style: "italic", fill: rgb("#6b7280"))[#loc]] #h(1fr) #text(size: 8.5pt, fill: rgb("#4b5563"))[#date_str]\
          #if type(highlights) == array [
            #for h_item in highlights [
              - #h_item
            ]
          ] else if type(highlights) == str and highlights != "" [
            - #highlights
          ]
          #v(0.3em)
        ]
      ]
    ]
  ] else if sec_type == "projects" [
    #let items = sec.at("items", default: ())
    #section-heading(sec_title)
    #if type(items) == array [
      #for proj in items [
        #if type(proj) == dictionary [
          #let name = proj.at("name", default: proj.at("title", default: ""))
          #let role = proj.at("role", default: "")
          #let url = proj.at("url", default: "")
          #let s_date = proj.at("start_date", default: "")
          #let e_date = proj.at("end_date", default: "")
          #let date_str = format-dates(s_date, e_date)
          #let desc = proj.at("description", default: "")
          #let techs = proj.at("technologies", default: proj.at("skills", default: ()))
          #let tech_str = if type(techs) == array { techs.join(", ") } else { str(techs) }

          #text(weight: "bold")[#name] #if role != "" [| #text(fill: rgb("#374151"))[#role]] #if url != "" [| #text(size: 8pt, fill: rgb("#2563eb"))[#url]] #h(1fr) #text(size: 8.5pt, fill: rgb("#4b5563"))[#date_str]\
          #if desc != "" [
            #desc\
          ]
          #if tech_str != "" [
            #text(size: 8.5pt, style: "italic", fill: rgb("#4b5563"))[Stack: #tech_str]\
          ]
          #v(0.3em)
        ]
      ]
    ]
  ] else if sec_type == "education" [
    #let items = sec.at("items", default: ())
    #section-heading(sec_title)
    #if type(items) == array [
      #for edu in items [
        #if type(edu) == dictionary [
          #let inst = edu.at("institution", default: edu.at("school", default: ""))
          #let deg = edu.at("degree", default: "")
          #let field = edu.at("field_of_study", default: edu.at("field", default: ""))
          #let s_date = edu.at("start_date", default: "")
          #let e_date = edu.at("end_date", default: "")
          #let date_str = format-dates(s_date, e_date)

          #text(weight: "bold")[#deg] #if field != "" [– #field] #if inst != "" [| #text(fill: rgb("#374151"))[#inst]] #h(1fr) #text(size: 8.5pt, fill: rgb("#4b5563"))[#date_str]\
          #v(0.2em)
        ]
      ]
    ]
  ] else if sec_type == "certificates" [
    #let items = sec.at("items", default: ())
    #section-heading(sec_title)
    #if type(items) == array [
      #for cert in items [
        #if type(cert) == dictionary [
          #let name = cert.at("name", default: cert.at("title", default: ""))
          #let issuer = cert.at("issuer", default: "")
          #let i_date = cert.at("issue_date", default: cert.at("date", default: ""))

          - *#name* #if issuer != "" [– #issuer] #h(1fr) #text(size: 8.5pt, fill: rgb("#4b5563"))[#i_date]
        ] else [
          - #cert
        ]
      ]
      #v(0.2em)
    ]
  ] else if sec_type == "languages" [
    #let items = sec.at("items", default: ())
    #section-heading(sec_title)
    #if type(items) == array [
      #for lang_item in items [
        #if type(lang_item) == dictionary [
          #let l_name = lang_item.at("name", default: lang_item.at("language", default: ""))
          #let l_level = lang_item.at("level", default: lang_item.at("proficiency", default: ""))
          - *#l_name* #if l_level != "" [– #l_level]
        ] else [
          - #lang_item
        ]
      ]
      #v(0.2em)
    ]
  ] else if sec_type == "trainings" [
    #let items = sec.at("items", default: ())
    #section-heading(sec_title)
    #if type(items) == array [
      #for trn in items [
        #if type(trn) == dictionary [
          #let t_name = trn.at("name", default: trn.at("title", default: ""))
          #let t_org = trn.at("organizer", default: trn.at("provider", default: trn.at("issuer", default: "")))
          #let t_date = trn.at("date", default: trn.at("completion_date", default: ""))
          #let t_desc = trn.at("description", default: "")

          - *#t_name* #if t_org != "" [| #text(fill: rgb("#374151"))[#t_org]] #h(1fr) #text(size: 8.5pt, fill: rgb("#4b5563"))[#t_date]\
          #if t_desc != "" [
            #h(1.2em)#text(size: 8.5pt, fill: rgb("#4b5563"))[#t_desc]\
          ]
        ] else [
          - #trn
        ]
      ]
      #v(0.2em)
    ]
  ] else if sec_type == "achievements" [
    #let items = sec.at("items", default: ())
    #section-heading(sec_title)
    #if type(items) == array [
      #for ach in items [
        #if type(ach) == dictionary [
          #let a_title = ach.at("title", default: ach.at("name", default: ""))
          #let a_issuer = ach.at("issuer", default: ach.at("organization", default: ""))
          #let a_date = ach.at("date", default: "")
          #let a_desc = ach.at("description", default: "")

          - *#a_title* #if a_issuer != "" [| #text(fill: rgb("#374151"))[#a_issuer]] #h(1fr) #text(size: 8.5pt, fill: rgb("#4b5563"))[#a_date]\
          #if a_desc != "" [
            #h(1.2em)#text(size: 8.5pt, fill: rgb("#4b5563"))[#a_desc]\
          ]
        ] else [
          - #ach
        ]
      ]
      #v(0.2em)
    ]
  ] else if sec_type == "interests" [
    #let items = sec.at("items", default: ())
    #let content = sec.at("content", default: sec.at("description", default: ""))
    #section-heading(sec_title)
    #if content != "" and content != none [
      #content\
    ]
    #if type(items) == array and items.len() > 0 [
      #let items_str = items.map(str).join("  •  ")
      #items_str
    ]
    #v(0.2em)
  ] else if sec_type == "pagebreak" [
    #pagebreak()
  ] else if sec_type == "clause" [
    #let custom_clause = sec.at("content", default: sec.at("text", default: i18n.clause))
    #v(1.2em)
    #align(bottom + center)[
      #text(
        font: clause_font,
        size: clause_size,
        weight: clause_weight,
        fill: rgb("#6b7280"),
      )[#custom_clause]
    ]
  ] else [
    #section-heading(sec_title)
    #let content = sec.at("content", default: sec.at("text", default: none))
    #let items = sec.at("items", default: none)
    #if content != none [
      #content\
    ]
    #if type(items) == array [
      #for item in items [
        - #if type(item) == dictionary { item.at("title", default: str(item)) } else { str(item) }
      ]
    ]
  ]
]
