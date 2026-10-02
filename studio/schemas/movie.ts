import { defineType, defineField } from 'sanity';

export const movie = defineType({
  name: 'movie',
  title: 'Movie',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().error('Movie title is required for compliance tracking.'),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'releaseYear',
      title: 'Release Year',
      type: 'number',
      validation: (Rule) =>
        Rule.required()
          .min(1888)
          .max(new Date().getFullYear() + 5)
          .error('Provide a valid release year.'),
    }),
    defineField({
      name: 'synopsis',
      title: 'Synopsis & Scene Context',
      type: 'text',
      rows: 4,
      description: 'Overview of movie narrative and general tone.',
    }),
    defineField({
      name: 'cbfcRating',
      title: 'CBFC Rating Classification',
      type: 'reference',
      to: [{ type: 'cbfcRating' }],
      description: 'Statutory age and exhibition classification by the Central Board of Film Certification.',
      validation: (Rule) => Rule.required().error('Every movie must have an official CBFC rating reference.'),
    }),
    defineField({
      name: 'triggerWarnings',
      title: 'Medical & Psychological Trigger Warnings',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'triggerWarning' }],
        },
      ],
      description: 'Structured list of certified physiological, sensory, or psychological hazards.',
      validation: (Rule) => Rule.unique().error('Trigger warnings must be unique references.'),
    }),
    defineField({
      name: 'mediaType',
      title: 'Media Format',
      type: 'string',
      options: {
        list: [
          { title: 'Feature Film', value: 'movie' },
          { title: 'TV Series / Show', value: 'series' },
          { title: 'Limited / Docu-Series', value: 'limited_series' },
        ],
        layout: 'radio',
      },
      initialValue: 'movie',
    }),
    defineField({
      name: 'runtimeMinutes',
      title: 'Runtime / Average Episode Length (Minutes)',
      type: 'number',
    }),
    defineField({
      name: 'complianceAuditStatus',
      title: 'Audit Verification Status',
      type: 'string',
      options: {
        list: [
          { title: 'Fully Certified', value: 'certified' },
          { title: 'Pending Review', value: 'pending_review' },
          { title: 'Flagged for High Risk', value: 'high_risk' },
        ],
        layout: 'radio',
      },
      initialValue: 'pending_review',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      releaseYear: 'releaseYear',
      ratingCode: 'cbfcRating.ratingCode',
      auditStatus: 'complianceAuditStatus',
    },
    prepare({ title, releaseYear, ratingCode, auditStatus }) {
      return {
        title: `${title} (${releaseYear || 'N/A'})`,
        subtitle: `Rating: ${ratingCode || 'Unrated'} | Status: ${auditStatus || 'pending'}`,
      };
    },
  },
});
