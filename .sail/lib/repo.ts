// What ties this .sail/ to yasli-frontend. Keep LABEL equal to project.yaml's `label`.

/** The designation label: `factory` picks up tickets and `review` pull requests that carry it. */
export const LABEL = 'sail-frontend';

/**
 * The label `groom` watches. Each repository needs its own: a watcher refuses a label another live watcher holds on the
 * same Linear team, and groom's checks read this repository's code.
 */
export const GROOM_LABEL = 'groom-frontend';

/** What a ticket a run files carries beside its type: its platform, and the groom label so it gets judged. */
export const FOLLOW_UP_LABELS = ['frontend', GROOM_LABEL];
