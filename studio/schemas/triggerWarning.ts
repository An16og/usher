import { defineType, defineField } from 'sanity';

export const triggerWarning = defineType({
  name: 'triggerWarning',
  title: 'Trigger Warning',
  type: 'document',
  fields: [
    defineField({
      name: 'hazard',
      title: 'Specific Hazard',
      type: 'string',
      description: 'Specific medical or sensory hazard (e.g., "Severe Strobe Lighting", "Explicit Gore", "Claustrophobic Panic Triggers").',
      validation: (Rule) => Rule.required().error('Hazard designation is required.'),
    }),
    defineField({
      name: 'category',
      title: 'Hazard Category',
      type: 'string',
      options: {
        list: [
          { title: 'Photosensitivity / Visual Strobe', value: 'photosensitivity' },
          { title: 'Acoustic / High Decibel Sensory', value: 'auditory' },
          { title: 'Physical Violence & Gore', value: 'violence' },
          { title: 'Psychological & Trauma Triggers', value: 'psychological' },
          { title: 'Substance Abuse & Addiction', value: 'substances' },
          { title: 'Medical / Phobia Triggers', value: 'phobias' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'severity',
      title: 'Medical / Safety Severity Level',
      type: 'string',
      options: {
        list: [
          { title: 'Mild - Minor discomfort, brief exposure', value: 'mild' },
          { title: 'Moderate - Noticeable intensity, moderate risk for sensitive groups', value: 'moderate' },
          { title: 'Severe - High intensity, acute risk of adverse physiological reaction', value: 'severe' },
          { title: 'Critical - Immediate hazard (e.g. prolonged flashing > 3Hz, rapid luminance shifts)', value: 'critical' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required().error('Severity level is mandatory for compliance gating.'),
    }),
    defineField({
      name: 'clinicalDescription',
      title: 'Clinical & Technical Description',
      type: 'text',
      rows: 3,
      description: 'Objective description of the stimulus (e.g., frequency of flashes per second, decibel peaks, visual explicitness).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'timestamps',
      title: 'Occurrence Timestamps / Scene Offsets',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Exact time stamps where this hazard occurs (e.g., "00:42:15 - 00:44:00").',
    }),
    defineField({
      name: 'affectedDemographics',
      title: 'Directly Affected Vulnerable Groups',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
      description: 'E.g., "Photosensitive Epilepsy", "PTSD", "Cardiac Patients", "Children < 12".',
    }),
  ],
  preview: {
    select: {
      hazard: 'hazard',
      severity: 'severity',
      category: 'category',
    },
    prepare({ hazard, severity, category }) {
      const severityEmojis: Record<string, string> = {
        mild: '🟡 Mild',
        moderate: '🟠 Moderate',
        severe: '🔴 Severe',
        critical: '🚨 CRITICAL',
      };
      return {
        title: hazard || 'Unnamed Hazard',
        subtitle: `${severityEmojis[severity] || severity} | ${category || 'General'}`,
      };
    },
  },
});
