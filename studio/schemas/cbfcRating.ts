import { defineType, defineField } from 'sanity';

export const cbfcRating = defineType({
  name: 'cbfcRating',
  title: 'CBFC Rating',
  type: 'document',
  fields: [
    defineField({
      name: 'ratingCode',
      title: 'Rating Code',
      type: 'string',
      description: 'Official CBFC certification symbol (e.g., "U", "UA 7+", "UA 13+", "UA 16+", "A", "S").',
      options: {
        list: [
          { title: 'U (Unrestricted Public Exhibition)', value: 'U' },
          { title: 'UA 7+ (Parental Guidance for children under 7)', value: 'UA 7+' },
          { title: 'UA 13+ (Parental Guidance for children under 13)', value: 'UA 13+' },
          { title: 'UA 16+ (Parental Guidance for children under 16)', value: 'UA 16+' },
          { title: 'A (Restricted to Adults Only - 18+)', value: 'A' },
          { title: 'S (Restricted to Specialized Audiences - Doctors/Scientists)', value: 'S' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'minimumAge',
      title: 'Minimum Unsupervised Viewing Age',
      type: 'number',
      description: 'Absolute minimum age permitted without legal parental accompaniment.',
      validation: (Rule) => Rule.required().min(0).max(21),
    }),
    defineField({
      name: 'description',
      title: 'Statutory Description',
      type: 'text',
      rows: 2,
      description: 'Official description of allowed content and age restrictions.',
    }),
    defineField({
      name: 'advisoryNotice',
      title: 'Mandatory Display Advisory',
      type: 'string',
      description: 'Standard text shown on theatrical certificates and streaming overlays.',
    }),
  ],
  preview: {
    select: {
      ratingCode: 'ratingCode',
      minimumAge: 'minimumAge',
    },
    prepare({ ratingCode, minimumAge }) {
      return {
        title: `CBFC ${ratingCode}`,
        subtitle: `Minimum Unsupervised Age: ${minimumAge} years`,
      };
    },
  },
});
