import { defineType, defineField } from 'sanity';

export const accessibilityRule = defineType({
  name: 'accessibilityRule',
  title: 'Accessibility & Compliance Rule',
  type: 'document',
  fields: [
    defineField({
      name: 'ruleCode',
      title: 'Rule Identification Code',
      type: 'string',
      description: 'Unique standard compliance identifier (e.g., "ACC-EPI-001", "CBFC-UA13-VIOLENCE").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Rule Name / Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'targetDemographic',
      title: 'Target Demographic / Vulnerability Group',
      type: 'string',
      description: 'The exact audience group this rule protects (e.g., "Photosensitive Epilepsy", "Children Under 12", "Cardiovascular Sensitivity", "PTSD Sufferers").',
      validation: (Rule) => Rule.required().error('Target demographic must be specified.'),
    }),
    defineField({
      name: 'restrictionLevel',
      title: 'Enforcement Action / Restriction Level',
      type: 'string',
      options: {
        list: [
          { title: 'Strictly Prohibited - Hard gatekeeper block', value: 'strictly_prohibited' },
          { title: 'Parental Guidance Mandatory - Requires adult supervision', value: 'parental_guidance_mandatory' },
          { title: 'Medical Advisory Mandatory - Explicit warning & opt-in before playback', value: 'medical_advisory_mandatory' },
          { title: 'Caution Recommended - Informational banner', value: 'caution_recommended' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'triggerCondition',
      title: 'Triggering Hazard Condition',
      type: 'text',
      rows: 3,
      description: 'Clinical or regulatory criteria when this rule activates (e.g., "Any movie containing strobe lighting exceeding 3 flashes/second or luminance swings > 20 cd/m²").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'restrictionDetails',
      title: 'Mandatory Restriction Directive',
      type: 'text',
      rows: 3,
      description: 'The exact restriction or compliance requirement enforced on the viewer or exhibition.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Authoritative Source / Statutory Body',
      type: 'object',
      description: 'Legal statute, regulatory committee, or clinical medical board backing this rule.',
      fields: [
        defineField({
          name: 'authority',
          title: 'Issuing Authority / Organization',
          type: 'string',
          description: 'E.g., Central Board of Film Certification (CBFC), World Health Organization (WHO), Epilepsy Society UK.',
          validation: (Rule) => Rule.required().error('Authority name is mandatory for evidentiary audit.'),
        }),
        defineField({
          name: 'citation',
          title: 'Official Statutory Citation / Document Reference',
          type: 'string',
          description: 'E.g., "CBFC Cinematograph Act 1952 Guideline 2(viii)", "ITU-R Recommendation BT.1702-2 Section 3".',
          validation: (Rule) => Rule.required().error('Citation reference is required.'),
        }),
        defineField({
          name: 'publicationYear',
          title: 'Publication / Revision Year',
          type: 'number',
        }),
        defineField({
          name: 'officialUrl',
          title: 'Official Reference URL',
          type: 'url',
          description: 'Link to published standard or regulatory gazette.',
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'applicableTriggers',
      title: 'Applicable Trigger Warnings',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'triggerWarning' }],
        },
      ],
      description: 'Links this rule directly to specific hazard documents in the Sanity graph.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      code: 'ruleCode',
      demographic: 'targetDemographic',
      authority: 'source.authority',
    },
    prepare({ title, code, demographic, authority }) {
      return {
        title: `[${code || 'RULE'}] ${title}`,
        subtitle: `For: ${demographic} | Source: ${authority || 'Official Body'}`,
      };
    },
  },
});
