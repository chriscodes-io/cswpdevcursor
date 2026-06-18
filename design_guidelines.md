{
  "meta": {
    "brand_name": "Helm HR Ops",
    "tagline": "Direct. Assign. Adapt.",
    "product_type": "Manager-facing HR and operations dashboard with AI recommendations",
    "audience": "People managers, HR operations leads, shift supervisors in mid–large organizations",
    "goals": [
      "Distribute tasks quickly and transparently",
      "Assign work to the right people based on availability/skills",
      "Manage weekly schedules and resolve conflicts",
      "Act on AI recommendations with confidence"
    ],
    "emotional_tone": "Authoritative, calm, and precise — modern clarity with quiet warmth",
    "visual_intent_statement": "The interface feels like a well-organized operations room: crisp type, high-contrast neutrals, punches of deep blue-green for intent, and subtle motion that reinforces control.",
    "assumptions": {
      "data_integrations": ["HRIS", "Payroll", "Calendar (Google/Microsoft)", "Attendance"],
      "role": "Manager (read/write on assignments and scheduling)",
      "time_zone": "Auto-detected per user",
      "date_locale": "en-US"
    }
  },
  "tokens": {
    "color_mode": "light + dark",
    "palette": {
      "notes": "High contrast, not saturation. Avoid purple. No full-screen gradients. Status colors reserved for function.",
      "light": {
        "background": "0 0% 100%",
        "foreground": "220 15% 10%",
        "surface": "0 0% 99%",
        "card": "0 0% 100%",
        "card-foreground": "220 15% 10%",
        "primary": "204 70% 28%",        
        "primary-foreground": "0 0% 98%",
        "secondary": "160 22% 32%",      
        "secondary-foreground": "0 0% 98%",
        "accent": "200 16% 96%",          
        "accent-foreground": "220 15% 15%",
        "muted": "220 14% 96%",
        "muted-foreground": "220 10% 46%",
        "border": "220 12% 88%",
        "input": "220 12% 88%",
        "ring": "204 70% 28%",
        "status": {
          "success": "158 60% 32%",
          "warning": "38 92% 50%",
          "danger": "6 78% 52%",
          "info": "206 85% 45%",
          "neutral": "220 10% 46%"
        },
        "chart": {
          "1": "206 85% 45%",
          "2": "158 60% 38%",
          "3": "28 85% 47%",
          "4": "198 65% 34%",
          "5": "38 92% 50%"
        }
      },
      "dark": {
        "background": "220 15% 6%",
        "foreground": "0 0% 98%",
        "surface": "220 16% 10%",
        "card": "220 16% 10%",
        "card-foreground": "0 0% 98%",
        "primary": "204 70% 52%",
        "primary-foreground": "220 15% 6%",
        "secondary": "160 25% 42%",
        "secondary-foreground": "220 15% 6%",
        "accent": "220 14% 14%",
        "accent-foreground": "0 0% 98%",
        "muted": "220 14% 14%",
        "muted-foreground": "220 10% 66%",
        "border": "220 14% 18%",
        "input": "220 14% 18%",
        "ring": "204 70% 52%",
        "status": {
          "success": "158 60% 48%",
          "warning": "38 92% 56%",
          "danger": "6 78% 58%",
          "info": "206 85% 60%",
          "neutral": "220 10% 66%"
        },
        "chart": {
          "1": "206 85% 60%",
          "2": "158 60% 48%",
          "3": "28 85% 55%",
          "4": "198 65% 52%",
          "5": "38 92% 56%"
        }
      }
    },
    "typography": {
      "fonts": {
        "display": {
          "name": "Work Sans",
          "fallback": "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
          "import": "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap"
        },
        "body": {
          "name": "Work Sans",
          "fallback": "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
        },
        "mono": {
          "name": "IBM Plex Mono",
          "fallback": "SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", Courier, monospace",
          "import": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap"
        }
      },
      "scale": {
        "base": 15,
        "sizes": {
          "xs": 12,
          "sm": 13,
          "md": 15,
          "lg": 17,
          "xl": 20,
          "2xl": 24,
          "3xl": 30
        }
      },
      "weights": {"regular": 400, "medium": 500, "semibold": 600, "bold": 700},
      "tracking": {"tight": -0.01, "normal": 0, "wide": 0.01}
    },
    "radii": {"none": 0, "sm": 4, "md": 6, "lg": 8},
    "shadows": {
      "ambient": "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)",
      "direct": "0 1px 0 rgba(0,0,0,0.08)",
      "elevated": "0 6px 14px rgba(0,0,0,0.12)"
    },
    "spacing": {
      "unit": 4,
      "scale": [2,4,6,8,12,16,20,24,32,40,48,64]
    },
    "borders": {"thin": 1, "medium": 1.5, "thick": 2},
    "icon_set": "lucide-react",
    "grid": {"columns": 12, "gutter": 24, "max_width": 1440}
  },
  "accessibility": {
    "contrast": {
      "rules": [
        "Normal text >= 4.5:1",
        "Large text (>=18px or 14px bold) >= 3:1",
        "Interactive elements >= 3:1 vs background",
        "Overlay on images: add 8% to 12% scrim to maintain contrast"
      ]
    },
    "focus": {
      "ring": "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--ring))]"
    }
  },
  "layout": {
    "philosophy": "Web App & Dashboard — strict grid hierarchy, dense spacing, fixed sidebar",
    "page_shell": {
      "sidebar_width": 288,
      "sidebar_collapsed_width": 80,
      "content_max_width": 1440,
      "content_padding": 24,
      "header_height": 64,
      "edge_style": "subtle-roundness (max 8px)",
      "background_texture": "very subtle paper grain (1% opacity) for depth; no gradients"
    }
  },
  "navigation": {
    "sidebar": {
      "component": "shadcn/sidebar block (fixed)",
      "position": "left, fixed, full-height",
      "behavior": "collapsible with tooltip labels on hover when collapsed",
      "items": [
        {"label": "Overview", "icon": "LayoutDashboard", "path": "/"},
        {"label": "Tasks", "icon": "ListChecks", "path": "/tasks"},
        {"label": "Schedule", "icon": "CalendarRange", "path": "/schedule"},
        {"label": "Team", "icon": "Users", "path": "/team"},
        {"label": "Reports", "icon": "BarChart3", "path": "/reports"},
        {"label": "Settings", "icon": "Settings", "path": "/settings"}
      ],
      "style": {
        "bg": "bg-surface",
        "border": "border-r border-border",
        "item": "h-10 px-3 rounded-md text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent hover:shadow-sm transition-colors",
        "item_active": "bg-accent text-foreground shadow-sm",
        "icon": "size-5 text-foreground/70",
        "footer": "mt-auto p-3"
      }
    },
    "topbar": {
      "height": 64,
      "content": ["page-title", "global-search", "date-range", "theme-toggle", "user-menu"],
      "style": {
        "container": "sticky top-0 z-40 backdrop-blur-sm bg-background/85 border-b border-border",
        "title": "text-lg font-semibold tracking-tight",
        "search": "w-[420px]",
        "date_range": "min-w-[280px]",
        "theme_toggle": "ml-2",
        "user_menu": "ml-2"
      }
    }
  },
  "pages": {
    "dashboard_overview": {
      "route": "/",
      "sections": [
        {
          "id": "kpi_strip",
          "type": "grid",
          "grid": "grid grid-cols-12 gap-6",
          "items": [
            {
              "component": "kpi_card",
              "title": "Open Tasks",
              "value": "128",
              "delta": "+12%",
              "icon": "ListChecks",
              "col_span": 3,
              "style": {
                "container": "col-span-12 md:col-span-3 bg-card border border-border rounded-lg p-6 shadow-sm",
                "title": "text-sm text-muted-foreground",
                "value": "text-3xl font-semibold tracking-tight",
                "delta": "text-xs font-medium text-status-success"
              }
            },
            {
              "component": "kpi_card",
              "title": "Fill Rate",
              "value": "92%",
              "delta": "+3%",
              "icon": "CheckCircle2",
              "col_span": 3,
              "style": {
                "container": "col-span-12 md:col-span-3 bg-card border border-border rounded-lg p-6 shadow-sm",
                "title": "text-sm text-muted-foreground",
                "value": "text-3xl font-semibold tracking-tight",
                "delta": "text-xs font-medium text-status-info"
              }
            },
            {
              "component": "kpi_card",
              "title": "Utilization",
              "value": "76%",
              "delta": "-2%",
              "icon": "Activity",
              "col_span": 3,
              "style": {
                "container": "col-span-12 md:col-span-3 bg-card border border-border rounded-lg p-6 shadow-sm",
                "title": "text-sm text-muted-foreground",
                "value": "text-3xl font-semibold tracking-tight",
                "delta": "text-xs font-medium text-status-warning"
              }
            },
            {
              "component": "kpi_card",
              "title": "Conflicts",
              "value": "9",
              "delta": "+4",
              "icon": "AlertTriangle",
              "col_span": 3,
              "style": {
                "container": "col-span-12 md:col-span-3 bg-card border border-border rounded-lg p-6 shadow-sm",
                "title": "text-sm text-muted-foreground",
                "value": "text-3xl font-semibold tracking-tight",
                "value_color": "text-status-danger",
                "delta": "text-xs font-medium text-status-danger"
              }
            }
          ]
        },
        {
          "id": "ai_recommendations",
          "type": "panel",
          "title": "AI Recommendations",
          "description": "Suggested assignments and schedule optimizations based on availability, skills, and constraints.",
          "actions": [
            {"label": "Apply All", "variant": "primary", "icon": "Sparkles"},
            {"label": "Review Individually", "variant": "ghost"}
          ],
          "style": {
            "container": "mt-8 bg-card border border-border rounded-lg p-6 shadow-sm",
            "title": "text-base font-semibold",
            "desc": "text-sm text-muted-foreground",
            "list": "mt-4 space-y-3"
          },
          "item_blueprint": {
            "layout": "grid grid-cols-12 gap-3",
            "left": "col-span-12 md:col-span-8",
            "right": "col-span-12 md:col-span-4 flex items-center justify-end gap-2",
            "badge": "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground border border-border",
            "apply_btn": "btn-primary",
            "dismiss_btn": "btn-ghost"
          }
        },
        {
          "id": "task_board_and_calendar",
          "type": "split",
          "layout": "grid grid-cols-12 gap-6 mt-8",
          "left": {
            "title": "Assignments",
            "component": "kanban_board",
            "col_span": 7,
            "columns": [
              {"id": "todo", "title": "To Do", "count": 42, "color": "border-muted"},
              {"id": "inprogress", "title": "In Progress", "count": 19, "color": "border-info"},
              {"id": "blocked", "title": "Blocked", "count": 6, "color": "border-warning"}
            ],
            "card_blueprint": {
              "container": "bg-card border border-border rounded-md p-3 shadow-xs hover:shadow-sm transition-shadow",
              "title": "text-sm font-medium",
              "meta": "text-xs text-muted-foreground",
              "assignees": "flex -space-x-1",
              "priority_tag": {
                "low": "text-xs px-1.5 py-0.5 rounded bg-muted text-foreground",
                "med": "text-xs px-1.5 py-0.5 rounded bg-info/10 text-info border border-info/20",
                "high": "text-xs px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/20"
              },
              "cta": "mt-auto text-xs text-primary hover:underline"
            }
          },
          "right": {
            "title": "Schedule (Week)",
            "component": "calendar_week",
            "col_span": 5,
            "style": {
              "container": "bg-card border border-border rounded-lg p-4 shadow-sm",
              "header": "flex items-center justify-between mb-2",
              "grid": "mt-2 border-t border-border"
            },
            "event_style": {
              "default": "rounded-sm bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5",
              "overtime": "rounded-sm bg-warning/10 text-warning border border-warning/20 px-1.5 py-0.5",
              "leave": "rounded-sm bg-muted text-foreground px-1.5 py-0.5 border border-border"
            },
            "empty_state": {
              "title": "No events scheduled",
              "body": "Drag tasks from the board or use + to add a shift.",
              "image_url": "https://images.unsplash.com/photo-1553034710-47f9e03ff808?crop=entropy&cs=srgb&fm=jpg&q=85",
              "alt": "Minimal monthly calendar with pen",
              "image_style": "w-full max-h-[40vh] object-cover rounded-md border border-border"
            }
          }
        },
        {
          "id": "capacity_and_activity",
          "type": "split",
          "layout": "grid grid-cols-12 gap-6 mt-8",
          "left": {
            "title": "Team Capacity (This Week)",
            "component": "capacity_heatmap",
            "col_span": 7,
            "style": {
              "container": "bg-card border border-border rounded-lg p-6 shadow-sm",
              "legend": "text-xs text-muted-foreground"
            },
            "chart": {
              "type": "heatmap",
              "scale": ["#e6f0f3", "#b2d0db", "#7fb2c7", "#3f869e", "#1b4f63"],
              "status_mapping": {"over": "warning", "under": "info", "ok": "success"}
            }
          },
          "right": {
            "title": "Recent Activity",
            "component": "activity_feed",
            "col_span": 5,
            "style": {
              "container": "bg-card border border-border rounded-lg p-6 shadow-sm",
              "item": "py-2 border-b last:border-none border-border/60",
              "timestamp": "text-xs text-muted-foreground"
            }
          }
        }
      ]
    },
    "tasks": {
      "route": "/tasks",
      "components": ["filters_bar", "table_tasks", "drawer_assign"],
      "empty_state_image": {
        "url": "https://images.unsplash.com/photo-1676276375900-dd41f828c985?crop=entropy&cs=srgb&fm=jpg&q=85",
        "alt": "Whiteboard with post-its planning"
      }
    },
    "schedule": {
      "route": "/schedule",
      "components": ["calendar_week_full", "conflict_panel", "bulk_assign_modal"],
      "empty_state_image": {
        "url": "https://images.unsplash.com/photo-1657040298726-7189d3090d5e?crop=entropy&cs=srgb&fm=jpg&q=85",
        "alt": "Desk with monthly planner"
      }
    }
  },
  "components": {
    "buttons": {
      "variants": {
        "primary": "inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm hover:bg-[color-mix(in_hsl,hsl(var(--primary)),white 10%)] hover:text-[hsl(var(--primary-foreground))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]",
        "secondary": "inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[color-mix(in_hsl,hsl(var(--secondary)),white 8%)]",
        "ghost": "inline-flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-foreground",
        "danger": "inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[color-mix(in_hsl,hsl(var(--destructive)),white 8%)]"
      },
      "sizes": {
        "sm": "h-8 text-sm",
        "md": "h-10 text-sm",
        "lg": "h-11 text-base"
      }
    },
    "inputs": {
      "text": {
        "base": "h-10 px-3 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:border-[hsl(var(--ring))]"
      },
      "select": {"base": "h-10 rounded-md border border-input bg-background"},
      "date_range": {"base": "h-10 rounded-md border border-input bg-background"}
    },
    "table": {
      "container": "bg-card border border-border rounded-lg shadow-sm",
      "header": "bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground",
      "row": "border-t border-border hover:bg-accent/50",
      "cell": "py-3 px-3 text-sm",
      "density": "compact"
    },
    "kpi_card": {
      "container": "bg-card border border-border rounded-lg p-6 shadow-sm",
      "title": "text-sm text-muted-foreground",
      "value": "text-3xl font-semibold tracking-tight",
      "delta_positive": "text-xs font-medium text-status-success",
      "delta_negative": "text-xs font-medium text-status-danger"
    },
    "charts": {
      "library": "shadcn charts",
      "color_map": {"success": "#1f8a5b", "warning": "#f5a524", "danger": "#e4572e", "info": "#2f79e4", "neutral": "#6b7280"},
      "tooltip": "rounded-md bg-foreground text-background px-2 py-1 text-xs shadow-md"
    },
    "calendar_week": {
      "component": "shadcn/calendar",
      "height": 520,
      "grid_style": "border-l border-b border-border",
      "cell_style": "border-r border-t border-border/60 h-20 align-top p-1",
      "now_marker": "bg-status-info h-0.5",
      "event": {
        "default": "rounded-sm bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 inline-flex gap-1 items-center",
        "icons": {"overtime": "Timer", "leave": "Umbrella"}
      }
    },
    "kanban_board": {
      "column": {
        "container": "bg-background rounded-lg border border-border p-3",
        "header": "flex items-center justify-between mb-2",
        "title": "text-sm font-medium",
        "count": "text-xs text-muted-foreground"
      },
      "card": {
        "container": "bg-card border border-border rounded-md p-3 shadow-xs hover:shadow-sm transition-shadow",
        "title": "text-sm font-medium",
        "meta": "text-xs text-muted-foreground",
        "avatars": "flex -space-x-1",
        "cta": "mt-auto text-xs text-primary hover:underline"
      }
    },
    "drawers_modals": {
      "assign_task_drawer": {
        "trigger": "primary button",
        "panel": "fixed right-0 top-0 h-full w-[520px] bg-background border-l border-border shadow-xl",
        "header": "p-4 border-b border-border text-base font-semibold",
        "body": "p-4 space-y-4",
        "footer": "p-4 border-t border-border flex items-center gap-2",
        "actions": [{"label": "Assign", "variant": "primary"}, {"label": "Cancel", "variant": "ghost"}]
      },
      "bulk_assign_modal": {
        "panel": "max-w-xl rounded-lg bg-background border border-border shadow-xl",
        "header": "p-4 border-b text-base font-semibold",
        "body": "p-4 space-y-4",
        "footer": "p-4 border-t flex justify-end gap-2"
      },
      "conflict_resolver_sheet": {
        "panel": "max-w-3xl rounded-lg bg-background border border-border shadow-xl",
        "content": "grid grid-cols-12 gap-4 p-4",
        "left": "col-span-12 md:col-span-8",
        "right": "col-span-12 md:col-span-4"
      }
    },
    "badges": {
      "neutral": "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted text-foreground border border-border",
      "info": "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-info/10 text-info border border-info/20",
      "warning": "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20",
      "danger": "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-danger/10 text-danger border border-danger/20",
      "success": "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-success/10 text-success border border-success/20"
    },
    "tooltips": {"base": "rounded-md bg-foreground text-background px-2 py-1 text-xs shadow-md"},
    "toasts": {"base": "rounded-md bg-foreground text-background px-3 py-2 text-sm shadow-md"},
    "skeleton": {"base": "animate-pulse bg-muted rounded"},
    "scrollbars": {
      "css": "::-webkit-scrollbar{height:10px;width:10px}::-webkit-scrollbar-thumb{background-color:hsl(var(--border));border-radius:8px;border:2px solid transparent;background-clip:content-box}::-webkit-scrollbar-track{background:transparent}"
    }
  },
  "images": [
    {
      "usage": "Schedule page empty state",
      "url": "https://images.unsplash.com/photo-1657040298726-7189d3090d5e?crop=entropy&cs=srgb&fm=jpg&q=85",
      "alt": "Monthly planner with pen",
      "style": "w-full max-h-[50vh] object-cover rounded-md border border-border"
    },
    {
      "usage": "Tasks page empty state",
      "url": "https://images.unsplash.com/photo-1676276375900-dd41f828c985?crop=entropy&cs=srgb&fm=jpg&q=85",
      "alt": "Whiteboard with colorful post-its",
      "style": "w-full max-h-[50vh] object-cover rounded-md border border-border"
    },
    {
      "usage": "Calendar empty in overview widget",
      "url": "https://images.unsplash.com/photo-1553034710-47f9e03ff808?crop=entropy&cs=srgb&fm=jpg&q=85",
      "alt": "Minimal calendar",
      "style": "w-full max-h-[40vh] object-cover rounded-md border border-border"
    }
  ],
  "motion": {
    "principles": [
      "Micro over macro: reinforce comprehension, not spectacle",
      "Use 160–220ms for UI feedback; 240–320ms for panel transitions"
    ],
    "easings": {"standard": "cubic-bezier(0.2, 0.0, 0, 1)", "enter": "cubic-bezier(0.16, 1, 0.3, 1)", "exit": "cubic-bezier(0.7, 0, 0.84, 0)"},
    "specs": {
      "list_stagger": {"delay": 0.04, "duration": 0.22, "from": {"opacity": 0, "y": 8}, "to": {"opacity": 1, "y": 0}},
      "panel_slide_in": {"duration": 0.26, "from": {"opacity": 0, "x": 24}, "to": {"opacity": 1, "x": 0}},
      "tooltip_fade": {"duration": 0.14, "from": {"opacity": 0, "scale": 0.98}, "to": {"opacity": 1, "scale": 1}}
    },
    "motion_dev_examples": {
      "button": "<motion.button whileTap={{scale:0.98}} whileHover={{y:-1}} transition={{duration:0.12}} />",
      "list_item": "<motion.li initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.22}} />",
      "drawer": "<motion.aside initial={{x:24,opacity:0}} animate={{x:0,opacity:1}} exit={{x:24,opacity:0}} transition={{duration:0.26}} />"
    }
  },
  "shadcn_overrides": {
    "notes": "Override defaults to match density and contrast; ensure explicit text colors on hover/active.",
    "button.jsx": {
      "root": "rounded-md font-medium tracking-tight disabled:opacity-50 disabled:cursor-not-allowed",
      "variants": {
        "default": "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[color-mix(in_hsl,hsl(var(--primary)),white 10%)] hover:text-[hsl(var(--primary-foreground))]",
        "secondary": "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[color-mix(in_hsl,hsl(var(--secondary)),white 8%)]",
        "outline": "border border-border bg-background text-foreground hover:bg-accent",
        "ghost": "text-foreground hover:bg-accent",
        "destructive": "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[color-mix(in_hsl,hsl(var(--destructive)),white 8%)]"
      },
      "sizes": {"sm": "h-8 px-3 text-sm", "default": "h-10 px-4 text-sm", "lg": "h-11 px-4 text-base"}
    },
    "input.jsx": {"root": "h-10 px-3 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:border-[hsl(var(--ring))]"},
    "select.jsx": {"trigger": "h-10 rounded-md border border-input bg-background"},
    "calendar.jsx": {"root": "p-2 text-sm", "day": "h-8 w-8 rounded-md hover:bg-accent aria-selected:bg-primary aria-selected:text-primary-foreground"},
    "table.jsx": {"row": "hover:bg-accent/50", "th": "uppercase text-xs tracking-wide text-muted-foreground", "td": "text-sm"},
    "tabs.jsx": {"list": "border-b border-border", "trigger": "data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-[hsl(var(--ring))]"},
    "toast.jsx": {"root": "rounded-md bg-foreground text-background"},
    "tooltip.jsx": {"content": "rounded-md bg-foreground text-background px-2 py-1 text-xs shadow-md"},
    "scroll-area.jsx": {"viewport": "[&_*::-webkit-scrollbar]:h-2 [&_*::-webkit-scrollbar-thumb]:bg-border [&_*::-webkit-scrollbar-thumb]:rounded"}
  },
  "implementation_notes": {
    "tailwind_tokens_update": {
      "file": "/app/frontend/src/index.css",
      "instructions": "Replace :root and .dark HSL variables with values in tokens.palette.light and tokens.palette.dark. Map as: --background, --foreground, --card, --card-foreground, --primary, --primary-foreground, --secondary, --secondary-foreground, --accent, --accent-foreground, --muted, --muted-foreground, --border, --input, --ring, --chart-1..5. Add custom --surface if desired or map to background for Tailwind usage.",
      "accessibility": "Re-validate hover and focus contrast using APCA; adjust tints by 8–12% as needed."
    },
    "font_loading": {
      "add_to_head": [
        "<link href=\"https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap\" rel=\"stylesheet\">",
        "<link href=\"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap\" rel=\"stylesheet\">"
      ],
      "css": "html,body{font-family:'Work Sans',system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial,sans-serif} code, .font-mono{font-family:'IBM Plex Mono',SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',Courier,monospace}"
    },
    "icon_usage": "Use lucide-react only. Import individual icons per component.",
    "grid_rules": [
      "Use grid grid-cols-12 gap-6 on main sections",
      "Grid children must be direct children of .grid (wrap animations with display:grid; grid-template-columns: subgrid)"
    ],
    "hover_active_visibility": "Always set text color on hover/active backgrounds. Example: hover:bg-slate-900 hover:text-white",
    "cta_alignment": "Apply mt-auto to CTAs in grid-based cards to align to bottom",
    "no_fullscreen_gradients": true,
    "custom_scrollbars": "Add CSS from components.scrollbars.css to global stylesheet"
  },
  "content_examples": {
    "ai_recommendation_item": {
      "title": "Assign Avery Chen to Client Onboarding (Tue 10–2)",
      "reason": "Skill match: onboarding + available window; avoids overtime",
      "confidence": 0.82,
      "actions": ["Apply", "Dismiss"],
      "badge": "Schedule"
    },
    "task_card": {
      "title": "Prepare payroll variance report",
      "meta": "Due Thu • Finance • Priority: High",
      "assignees": ["AD", "MB"]
    }
  },
  "research_references": [
    {
      "source": "https://www.rib-software.com/en/blogs/bi-dashboard-design-principles-best-practices",
      "use": "Hierarchy and KPI storytelling in enterprise dashboards"
    },
    {
      "source": "https://www.qlik.com/us/dashboard-examples/hr-dashboard",
      "use": "HR dashboard structure and workforce allocation patterns"
    }
  ],
  "verification": {
    "hall_of_shame_checks": [
      "No purple gradients or neon blends used",
      "No Inter font used; Work Sans + IBM Plex Mono instead",
      "Layouts avoid center-everything; left-aligned, grid-based",
      "No decorative gradients; texture < 1% opacity only"
    ]
  }
}