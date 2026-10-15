// KandidFlow — ATS-Optimized Typst Resume Template (Single-Column)
#set page(
  paper: "a4",
  margin: (x: 1.8cm, y: 1.8cm),
)

// Read raw data from sys.inputs or fallback to empty JSON
#let raw_input = sys.inputs.at("cv_data", default: "{}")
#let cv_data = json(bytes(raw_input))

// Candidate & Contact Details
#let full_name = cv_data.at("full_name", default: cv_data.at("name", default: "Jan Kowalski"))
#let contact = cv_data.at("contact_info", default: cv_data.at("contact", default: (:)))
#let lang = cv_data.at("language", default: "pl")

#set text(
  font: ("Liberation Sans", "DejaVu Sans", "Arial"),
  size: 9.5pt,
  lang: lang,
)
#set par(justify: true, leading: 0.65em)

// Localization Dictionary
#let dict = (
  pl: (
    summary: "O mnie",
    skills: "Umiejętności techniczne",
    experience: "Doświadczenie zawodowe",
    projects: "Projekty",
    education: "Edukacja",
    certificates: "Certyfikaty",
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
    present: "Present",
    clause: "I hereby consent to my personal data being processed for the purpose of the recruitment process in accordance with the General Data Protection Regulation (EU) 2016/679 (GDPR)."
  )
)
#let i18n = dict.at(lang, default: dict.at("pl"))

// Helper for section headings
#let section-heading(title) = [
  #v(0.6em)
  #text(size: 11pt, weight: "bold", fill: rgb("#111827"))[#upper(title)]
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
  #text(size: 18pt, weight: "bold", fill: rgb("#111827"))[#full_name]\
  #if contact_items.len() > 0 [
    #v(0.2em)
    #text(size: 8.5pt, fill: rgb("#4b5563"))[
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
  ] else if sec_type == "clause" [
    #let custom_clause = sec.at("content", default: sec.at("text", default: i18n.clause))
    #v(1.2em)
    #align(bottom + center)[
      #text(size: 7pt, fill: rgb("#6b7280"))[#custom_clause]
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
