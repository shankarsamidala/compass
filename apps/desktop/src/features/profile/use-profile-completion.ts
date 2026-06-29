import { useProfilePrefs } from "@/features/settings/profile-api";
import { useEducation } from "./education-api";
import { useCertifications } from "./certifications-api";
import { useExperiences } from "./experience-api";
import { useProjects } from "./projects-api";
import { useSkills } from "./skills-api";
import { useHotTakes } from "./proof-points-api";
import { useCvUploads } from "./cv-uploads-api";

/**
 * Profile-completion percentage — the same nine sections the profile page scores,
 * centralized so the app shell can gate navigation until the profile is 100%.
 * `ready` is false until every underlying query has settled, so the shell never
 * locks on a transient empty state during load.
 */
export function useProfileCompletion() {
  const profileQ = useProfilePrefs();
  const eduQ = useEducation();
  const certQ = useCertifications();
  const expQ = useExperiences();
  const projQ = useProjects();
  const skillsQ = useSkills();
  const hotTakesQ = useHotTakes();
  const cvQ = useCvUploads();

  const p = profileQ.data;
  const len = (d: unknown[] | undefined) => d?.length ?? 0;
  const sections = [
    Boolean(p?.headline?.trim() && p?.bio?.trim()),
    Boolean(p?.location?.trim()),
    len(expQ.data) >= 1,
    len(eduQ.data) >= 3,
    len(skillsQ.data) >= 1,
    len(projQ.data) >= 1,
    len(certQ.data) >= 1,
    len(hotTakesQ.data) >= 1,
    len(cvQ.data) >= 1,
  ];
  const done = sections.filter(Boolean).length;
  const pct = Math.round((done / sections.length) * 100);
  const ready = [profileQ, eduQ, certQ, expQ, projQ, skillsQ, hotTakesQ, cvQ].every((q) => !q.isPending);

  return { pct, complete: pct === 100, ready };
}
