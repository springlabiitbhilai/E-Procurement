// Project registration details are stored in two shapes:
// - older records keep fields directly on piSubmission
// - newer records keep them inside piSubmission.signedPayload
// Merge both so pages can read either shape the same way.
export const getProjectData = (project) => {
  const submission = project?.piSubmission || {};

  return { ...submission, ...(submission.signedPayload || {}) };
};
