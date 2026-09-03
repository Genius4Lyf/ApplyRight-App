import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Seo from './Seo';
import { seoKeyForPath } from '../lib/pageMeta';

// Gives every route a title and a description without each page having to remember to.
//
// Done from the route rather than page by page because "all of them" is the requirement:
// a per-page tag is one import somebody forgets, and the page that gets forgotten is
// always the new one. Pages that DO own their meta opt out via seoKeyForPath, so there is
// still exactly one owner per page.
const RouteSeo = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const key = seoKeyForPath(pathname);
  if (!key) return null;

  return (
    <Seo title={t(`seo.pages.${key}.title`)} description={t(`seo.pages.${key}.description`)} />
  );
};

export default RouteSeo;
