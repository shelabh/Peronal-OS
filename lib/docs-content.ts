export interface DocsCallout {
  title: string;
  tone?: "info" | "tip" | "warning";
  body: string;
}

export interface DocsWorkflowStep {
  title: string;
  description: string;
}

export interface DocsSection {
  heading: string;
  body: string;
  bullets?: string[];
  callout?: DocsCallout;
  workflowSteps?: DocsWorkflowStep[];
}

export interface DocsTab {
  id: string;
  label: string;
  title: string;
  intro: string;
  sections: DocsSection[];
}

export const docsTabs: DocsTab[] = [
  {
    id: "overview",
    label: "Overview",
    title: "What Personal OS Is",
    intro:
      "Personal OS is a life operating system for capturing what you do, what matters, what is changing, and what your data suggests you should do next.",
    sections: [
      {
        heading: "The core idea",
        body:
          "Most tools only track one slice of life. Personal OS links execution, behavior, measurement, reflection, and coaching together so your data becomes more useful over time.",
        bullets: [
          "Tasks capture one-off execution.",
          "Habits capture recurring behavior rules.",
          "Metrics capture measurable signals.",
          "Projects and goals connect work to long-term direction.",
          "Reviews, AI, and experiments turn raw data into course correction.",
        ],
      },
      {
        heading: "Tracking, reflection, and coaching are different jobs",
        body:
          "The app is most useful when each layer stays honest about its role. You do not want one page trying to be everything.",
        bullets: [
          "Tracking answers: what happened?",
          "Reflection answers: what did it mean?",
          "Coaching answers: what should I change next?",
        ],
        callout: {
          title: "Use the app as a system, not a pile of pages",
          tone: "tip",
          body:
            "The value compounds when you keep modules linked instead of treating tasks, habits, metrics, and reviews as separate islands.",
        },
      },
      {
        heading: "Getting started",
        body:
          "A simple setup beats an overbuilt setup. Start small, use it consistently, and let the structure deepen over time.",
        workflowSteps: [
          {
            title: "Create 3-5 life areas",
            description: "Pick domains like Health, Career, Learning, Relationships, or Finance.",
          },
          {
            title: "Add one goal and one project",
            description: "Give the system something strategic and something active.",
          },
          {
            title: "Create a few tasks",
            description: "Break the active project into concrete next actions.",
          },
          {
            title: "Add 2-3 habits and 2-4 metrics",
            description: "Track only the behaviors and signals that genuinely matter.",
          },
          {
            title: "Use Today daily and Weekly Review weekly",
            description: "That is the minimum rhythm that makes the system come alive.",
          },
        ],
      },
    ],
  },
  {
    id: "daily-flow",
    label: "Daily Flow",
    title: "How To Use The App Day To Day",
    intro:
      "The best daily rhythm is light, repeatable, and truthful. The app should support decisions, not create more busywork.",
    sections: [
      {
        heading: "Morning or start-of-day flow",
        body:
          "Begin with the Today page. It is the command center for the current day, not just a dashboard.",
        workflowSteps: [
          {
            title: "Open Today",
            description: "See current tasks, habits, metrics, and daily check-in context in one place.",
          },
          {
            title: "Review priorities and AI plan",
            description: "Use the AI plan to pressure-test your day, not to outsource your judgment.",
          },
          {
            title: "Check active experiments",
            description: "If you are running an experiment, make sure today’s actions reflect it.",
          },
        ],
      },
      {
        heading: "During the day",
        body:
          "Log as you go when possible. The more immediate and truthful the data, the more useful the reviews and AI become later.",
        bullets: [
          "Complete tasks as they are done.",
          "Check off habits or log quantity/threshold values.",
          "Update metrics like sleep, deep work, pages read, or cigarettes smoked.",
          "Use milestones inside projects to keep progress grounded in execution.",
        ],
      },
      {
        heading: "End-of-day flow",
        body:
          "Do a brief check-in even if the day was messy. Honest low-quality data is still more useful than skipping the day entirely.",
        workflowSteps: [
          {
            title: "Log check-in signals",
            description: "Update stress, cravings, recovery, focus friction, and reflection if relevant.",
          },
          {
            title: "Review what actually moved",
            description: "Look at tasks done, habit consistency, and whether key metrics moved in the right direction.",
          },
          {
            title: "Leave a short reflection",
            description: "A few real sentences help the system understand context that numbers miss.",
          },
        ],
        callout: {
          title: "Do not optimize for perfect logging",
          tone: "info",
          body:
            "A durable rhythm matters more than perfect completeness. Personal OS gets stronger through consistency, not intensity.",
        },
      },
      {
        heading: "Weekly rhythm",
        body:
          "Weekly Review is where the system turns from tracking into learning.",
        bullets: [
          "Review what happened across tasks, habits, metrics, and life areas.",
          "Notice patterns and pressure before they become bigger failures.",
          "Use AI analysis to synthesize, not replace, your own judgment.",
          "Start, continue, complete, or abandon experiments based on evidence.",
        ],
      },
    ],
  },
  {
    id: "modules",
    label: "Modules",
    title: "How Each Module Works",
    intro:
      "Each module represents a different layer of your life system. The app works best when you use each one for the job it is meant to do.",
    sections: [
      {
        heading: "Tasks",
        body:
          "Tasks are one-off actions. They should be concrete, finite, and executable.",
        bullets: [
          "Use tasks for next actions, not vague intentions.",
          "Attach tasks to projects and goals when possible.",
          "Do not use tasks for recurring behavior. That belongs in habits.",
        ],
      },
      {
        heading: "Habits",
        body:
          "Habits are recurring behavior rules. They represent what you want to do consistently, not just what you did once.",
        bullets: [
          "A habit can be binary, quantity-based, or threshold-based.",
          "Use the habit name to make the rule clear, for example Read 20 pages or Sleep before 11:30.",
          "Habits are best for consistency, routines, and identity-level behavior.",
        ],
        callout: {
          title: "Habit vs metric",
          tone: "tip",
          body:
            "Use a habit when the question is Did I follow the rule? Use a metric when the question is How much or how well? For reading, Read 20 pages can be a habit while Pages Read is the metric.",
        },
      },
      {
        heading: "Projects",
        body:
          "Projects are active initiatives. They are not just containers anymore; they are execution systems with milestones and linked tasks.",
        bullets: [
          "Use projects for work that takes multiple steps over time.",
          "Define milestones so progress is grounded in actual execution.",
          "Projects can advance a goal directly or support a life area more broadly.",
        ],
      },
      {
        heading: "Goals",
        body:
          "Goals are desired outcomes. They should describe where you are trying to get, not every task along the way.",
        bullets: [
          "A goal should usually be advanced through projects or direct tasks.",
          "Do not use goals as task lists.",
          "Goals help the system connect day-level behavior to longer-term direction.",
        ],
      },
      {
        heading: "Metrics",
        body:
          "Metrics are measurable signals. They tell you how much, how often, how intensely, or in which direction something is moving.",
        bullets: [
          "Use metrics for sleep, mood, deep work, pages read, cigarettes smoked, screen time, and similar signals.",
          "Metrics can be increase, decrease, or maintain style signals.",
          "Strategic metrics can feed AI and reviews when you opt them in.",
        ],
        callout: {
          title: "How to model bad-habit reduction",
          tone: "warning",
          body:
            "For something like Cigarettes Smoked, use a decrease metric with a target like 0 and link it to the Health life area. If you also want a binary behavior rule, pair it with a habit like Smoke-free evening.",
        },
      },
      {
        heading: "Life Areas, Weekly Review, AI, and Experiments",
        body:
          "These modules connect everything else into a strategic learning loop.",
        bullets: [
          "Life Area = strategic lens such as Health, Career, Learning, or Relationships.",
          "Weekly Review = interpretation and course correction based on the week’s evidence.",
          "AI Insights and Daily Plan = structured guidance generated from your data, memory, and patterns.",
          "Experiments = intervention loops for testing what actually improves a pattern.",
        ],
      },
      {
        heading: "How to build your system well",
        body:
          "A strong setup is linked, small, and honest.",
        bullets: [
          "Start with 3-5 life areas.",
          "Define goals inside those areas.",
          "Create projects under goals or areas.",
          "Break projects into milestones and tasks.",
          "Add a few habits and metrics that genuinely matter.",
        ],
      },
      {
        heading: "How to avoid using the app badly",
        body:
          "More data does not automatically mean more insight.",
        bullets: [
          "Do not overtrack everything.",
          "Do not create vanity metrics with no decision attached.",
          "Do not use goals as task lists.",
          "Do not use habits for quantities unless the rule itself is the point.",
          "Keep the data truthful, not aspirational.",
        ],
      },
    ],
  },
  {
    id: "ai-system",
    label: "AI System",
    title: "How The AI Layer Works",
    intro:
      "The AI in Personal OS is structured, data-driven, and bounded. It is meant to help you think better, not to behave like a vague motivational chatbot.",
    sections: [
      {
        heading: "Weekly AI analysis",
        body:
          "Weekly analysis is generated from your recent life summary, strategic metrics, life-area scorecards, execution context, detected patterns, memory, and experiment state.",
        bullets: [
          "It looks for insights, problems, recommendations, and top priorities.",
          "It works best when you have at least a week of real usage data.",
          "It should be treated as a strategic review partner, not an unquestionable authority.",
        ],
      },
      {
        heading: "Daily AI planning",
        body:
          "Daily planning uses your current tasks, goals, projects, today’s check-in context, opted-in metrics, and active experiments to suggest a practical day plan.",
        bullets: [
          "It is especially useful when sleep, energy, or focus context changes what a realistic day looks like.",
          "It should help reduce overload, not create it.",
        ],
      },
      {
        heading: "Memory and patterns",
        body:
          "The system stores durable learnings and uses deterministic pattern detection before the AI layer synthesizes recommendations.",
        bullets: [
          "Memory stores useful recurring lessons, preferences, and strategies.",
          "Pattern detection looks for relationships across habits, metrics, check-ins, tasks, and reviews.",
          "Experiments help test whether a recommendation actually works in your life.",
        ],
        callout: {
          title: "Grounded, not magical",
          tone: "info",
          body:
            "AI recommendations are generated from tracked data, linked context, memory, and detected patterns. They are only as good as the structure and honesty of the underlying system.",
        },
      },
      {
        heading: "How to get better AI output",
        body:
          "The AI becomes more useful when the system is used well.",
        bullets: [
          "Keep life areas, goals, projects, tasks, habits, and metrics linked.",
          "Log enough data to create patterns without drowning the system in noise.",
          "Use reviews and reflections to add context numbers cannot capture.",
          "Run experiments when you want to change a pattern, not just observe it.",
        ],
      },
    ],
  },
  {
    id: "philosophy",
    label: "Philosophy",
    title: "The Personal OS Philosophy",
    intro:
      "Personal OS is meant to become more than a productivity tracker. It is designed as a structured model of your life over time.",
    sections: [
      {
        heading: "Beyond productivity",
        body:
          "The long-term goal is not simply to complete more tasks. It is to understand how your behavior, environment, recovery, priorities, and decisions interact across time.",
        bullets: [
          "Behavior matters.",
          "Outcomes matter.",
          "Interpretation matters.",
          "Memory matters.",
        ],
      },
      {
        heading: "Why everything is linked",
        body:
          "An isolated task manager cannot explain your life. A life operating system can start to explain why certain weeks go well, why certain patterns recur, and what interventions actually help.",
        bullets: [
          "Life areas connect daily behavior to strategic domains.",
          "Goals and projects connect intention to execution.",
          "Metrics and check-ins connect outcomes to context.",
          "Reviews, AI, and experiments connect evidence to change.",
        ],
      },
      {
        heading: "How to think as a user",
        body:
          "Use the app as a system for reality, not for self-image. The more honestly you use it, the more intelligently it can help you later.",
        bullets: [
          "Track what matters, not what looks impressive.",
          "Let weak weeks stay weak in the data.",
          "Prefer useful truth over tidy dashboards.",
          "Build gradually and keep the system coherent.",
        ],
        callout: {
          title: "The long arc",
          tone: "tip",
          body:
            "Over time, the app is meant to become a personal intelligence substrate: a structured record of how you live, how you change, and what is likely to help or hurt you next.",
        },
      },
    ],
  },
];
