import cvHeadshotLeinad from '../../assets/landing/cv-headshot-leinad.webp';
import cvHeadshotSales from '../../assets/landing/cv-headshot-sales.webp';

export const ROLE_CVS = [
  { id: 'customerService', templateId: 'applyright-navy', template: 'ApplyRight Navy', photoUrl: cvHeadshotLeinad },
  { id: 'sales', templateId: 'sales-sidebar', template: 'Sales Sidebar', photoUrl: cvHeadshotSales },
  { id: 'data', templateId: 'angular-corporate', template: 'Angular Corporate' },
  { id: 'admin', templateId: 'the-ascent', template: 'The Ascent' },
  { id: 'adminTimeline', contentId: 'admin', templateId: 'slate-timeline', template: 'Slate Timeline', photoUrl: cvHeadshotSales },
  { id: 'salesPortrait', contentId: 'sales', templateId: 'navy-portrait', template: 'Navy Portrait', photoUrl: cvHeadshotSales },
  { id: 'adminProfile', contentId: 'admin', templateId: 'the-profile', template: 'The Profile', photoUrl: cvHeadshotSales },
  { id: 'financeCorporate', contentId: 'finance', templateId: 'executive-corporate', template: 'Corporate Clean' },
  { id: 'dataModern', contentId: 'data', templateId: 'modern', template: 'Modern Clean', photoUrl: cvHeadshotLeinad },
  { id: 'dataEnergy', contentId: 'data', templateId: 'executive-energy', template: 'Energy / Industrial', photoUrl: cvHeadshotLeinad },
  { id: 'adminOperations', contentId: 'admin', templateId: 'operations-blueprint', template: 'Operations Blueprint' },
];

export const roleCv = (t, item, outputLang = 'en') => {
  const key = `landing.journey.roleCvs.${item.contentId || item.id}`;
  const name = t(`${key}.name`);
  const [firstName, ...lastParts] = name.split(' ');
  const role = t(`${key}.role`);
  const markdown = `# ${name}

## Professional Summary
${t(`${key}.summary`)}

## Work Experience

### ${t(`${key}.company`)} | 2022 – Present
- ${t(`${key}.bullet1`)}
- ${t(`${key}.bullet2`)}
- ${t(`${key}.bullet3`)}

### ${t(`${key}.previousCompany`)} | 2019 – 2022
- ${t(`${key}.previousBullet1`)}
- ${t(`${key}.previousBullet2`)}

## Projects

### ${t(`${key}.project`)}
- ${t(`${key}.projectBullet`)}

### ${t('landing.journey.cvSample.secondProject', { role })}
- ${t('landing.journey.cvSample.secondProjectBullet')}

## Education
${t(`${key}.education`)}

## Certifications
- ${t(`${key}.certification`)}

## Volunteer Experience

### ${t('landing.journey.cvSample.volunteerRole')} | 2020 – 2021
- ${t('landing.journey.cvSample.volunteerBullet1')}
- ${t('landing.journey.cvSample.volunteerBullet2')}

## Skills
${t(`${key}.skills`)}

## Additional Information
- ${t('landing.journey.cvSample.languages')}
- ${t('landing.journey.cvSample.references')}`;

  return {
    application: { optimizedCV: markdown, templateId: item.templateId, outputLang },
    profile: {
      firstName,
      lastName: lastParts.join(' '),
      fullName: name,
      currentJobTitle: role,
      email: `${firstName.toLowerCase()}.${lastParts.join('').toLowerCase()}@email.com`,
      phone: '0803 555 0142',
      location: 'Lagos, Nigeria',
      linkedinUrl: `linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}`,
      photoUrl: item.photoUrl || '',
    },
  };
};
