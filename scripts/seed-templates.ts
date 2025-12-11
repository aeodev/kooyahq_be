import { connectToDatabase, disconnectFromDatabase } from '../src/lib/mongo'
import { templateRepository } from '../src/modules/wiki-hub/template.repository'

const defaultTemplates = [
  {
    name: 'SOP Template',
    category: 'sop' as const,
    fieldsStructure: {
      sections: [
        { name: 'Purpose', required: true },
        { name: 'Scope', required: true },
        { name: 'Prerequisites', required: false },
        { name: 'Procedure', required: true },
        { name: 'Expected Outcomes', required: true },
        { name: 'Troubleshooting', required: false },
      ],
    },
    defaultContent: {
      type: 'html',
      content: `
        <h1>Standard Operating Procedure</h1>
        <h2>Purpose</h2>
        <p>Describe the purpose of this procedure...</p>
        <h2>Scope</h2>
        <p>Define the scope and applicability...</p>
        <h2>Prerequisites</h2>
        <ul>
          <li>Prerequisite 1</li>
          <li>Prerequisite 2</li>
        </ul>
        <h2>Procedure</h2>
        <ol>
          <li>Step 1: Description</li>
          <li>Step 2: Description</li>
          <li>Step 3: Description</li>
        </ol>
        <h2>Expected Outcomes</h2>
        <p>What should be achieved...</p>
        <h2>Troubleshooting</h2>
        <p>Common issues and solutions...</p>
      `,
    },
  },
  {
    name: 'Meeting Notes Template',
    category: 'meeting' as const,
    fieldsStructure: {
      sections: [
        { name: 'Date & Time', required: true },
        { name: 'Attendees', required: true },
        { name: 'Agenda', required: true },
        { name: 'Discussion Points', required: true },
        { name: 'Action Items', required: true },
        { name: 'Next Steps', required: false },
      ],
    },
    defaultContent: {
      type: 'html',
      content: `
        <h1>Meeting Notes</h1>
        <h2>Date & Time</h2>
        <p>Date: [Date]</p>
        <p>Time: [Time]</p>
        <h2>Attendees</h2>
        <ul>
          <li>Attendee 1</li>
          <li>Attendee 2</li>
        </ul>
        <h2>Agenda</h2>
        <ol>
          <li>Agenda item 1</li>
          <li>Agenda item 2</li>
        </ol>
        <h2>Discussion Points</h2>
        <p>Key points discussed...</p>
        <h2>Action Items</h2>
        <ul>
          <li>[ ] Action item 1 - Assignee: [Name]</li>
          <li>[ ] Action item 2 - Assignee: [Name]</li>
        </ul>
        <h2>Next Steps</h2>
        <p>What happens next...</p>
      `,
    },
  },
  {
    name: 'Project Plan Template',
    category: 'project' as const,
    fieldsStructure: {
      sections: [
        { name: 'Project Overview', required: true },
        { name: 'Objectives', required: true },
        { name: 'Timeline', required: true },
        { name: 'Resources', required: true },
        { name: 'Milestones', required: true },
        { name: 'Risks & Mitigation', required: false },
      ],
    },
    defaultContent: {
      type: 'html',
      content: `
        <h1>Project Plan</h1>
        <h2>Project Overview</h2>
        <p>Brief description of the project...</p>
        <h2>Objectives</h2>
        <ul>
          <li>Objective 1</li>
          <li>Objective 2</li>
          <li>Objective 3</li>
        </ul>
        <h2>Timeline</h2>
        <p><strong>Start Date:</strong> [Date]</p>
        <p><strong>End Date:</strong> [Date]</p>
        <h2>Resources</h2>
        <ul>
          <li>Resource 1</li>
          <li>Resource 2</li>
        </ul>
        <h2>Milestones</h2>
        <ol>
          <li>Milestone 1 - [Date]</li>
          <li>Milestone 2 - [Date]</li>
        </ol>
        <h2>Risks & Mitigation</h2>
        <p>Identify potential risks and mitigation strategies...</p>
      `,
    },
  },
  {
    name: 'Bug Report Template',
    category: 'bug' as const,
    fieldsStructure: {
      sections: [
        { name: 'Summary', required: true },
        { name: 'Steps to Reproduce', required: true },
        { name: 'Expected Behavior', required: true },
        { name: 'Actual Behavior', required: true },
        { name: 'Environment', required: true },
        { name: 'Additional Context', required: false },
      ],
    },
    defaultContent: {
      type: 'html',
      content: `
        <h1>Bug Report</h1>
        <h2>Summary</h2>
        <p>Brief description of the bug...</p>
        <h2>Steps to Reproduce</h2>
        <ol>
          <li>Step 1</li>
          <li>Step 2</li>
          <li>Step 3</li>
        </ol>
        <h2>Expected Behavior</h2>
        <p>What should happen...</p>
        <h2>Actual Behavior</h2>
        <p>What actually happens...</p>
        <h2>Environment</h2>
        <ul>
          <li><strong>OS:</strong> [Operating System]</li>
          <li><strong>Browser:</strong> [Browser and version]</li>
          <li><strong>Version:</strong> [App version]</li>
        </ul>
        <h2>Additional Context</h2>
        <p>Screenshots, logs, or other relevant information...</p>
      `,
    },
  },
  {
    name: 'Strategy Document Template',
    category: 'strategy' as const,
    fieldsStructure: {
      sections: [
        { name: 'Executive Summary', required: true },
        { name: 'Current State', required: true },
        { name: 'Goals & Objectives', required: true },
        { name: 'Strategy', required: true },
        { name: 'Implementation Plan', required: true },
        { name: 'Success Metrics', required: true },
      ],
    },
    defaultContent: {
      type: 'html',
      content: `
        <h1>Strategy Document</h1>
        <h2>Executive Summary</h2>
        <p>High-level overview of the strategy...</p>
        <h2>Current State</h2>
        <p>Analysis of the current situation...</p>
        <h2>Goals & Objectives</h2>
        <ul>
          <li>Goal 1</li>
          <li>Goal 2</li>
          <li>Goal 3</li>
        </ul>
        <h2>Strategy</h2>
        <p>Detailed strategy description...</p>
        <h2>Implementation Plan</h2>
        <ol>
          <li>Phase 1: [Description]</li>
          <li>Phase 2: [Description]</li>
          <li>Phase 3: [Description]</li>
        </ol>
        <h2>Success Metrics</h2>
        <ul>
          <li>Metric 1: [Target]</li>
          <li>Metric 2: [Target]</li>
        </ul>
      `,
    },
  },
]

async function seedTemplates() {
  try {
    await connectToDatabase()
    console.log('Connected to database')

    // Check if templates already exist
    const existingTemplates = await templateRepository.findGlobal()
    if (existingTemplates.length > 0) {
      console.log(`Found ${existingTemplates.length} existing templates. Skipping seed.`)
      await disconnectFromDatabase()
      return
    }

    console.log('Seeding default templates...')

    for (const template of defaultTemplates) {
      await templateRepository.create({
        name: template.name,
        workspaceId: undefined, // Global templates
        fieldsStructure: template.fieldsStructure,
        defaultContent: template.defaultContent,
        category: template.category,
      })
      console.log(`Created template: ${template.name}`)
    }

    console.log('Successfully seeded all templates!')
  } catch (error) {
    console.error('Error seeding templates:', error)
    throw error
  } finally {
    await disconnectFromDatabase()
    console.log('Disconnected from database')
  }
}

// Run if called directly
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('Seed completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seed failed:', error)
      process.exit(1)
    })
}

export { seedTemplates }
