import { parseInputs } from './inputs.js';
import { readTags } from './git.js';
import { formatVersion, incrementVersion, latestTag, parseVersion } from './version.js';
import { createClient, createMilestone } from './github.js';
import { escapeAnnotation, writeOutputs, writeSummary } from './output.js';

export async function run({ env = process.env, fetchImpl = globalThis.fetch, exec, now = new Date(), log = console.log } = {}) {
  const config = parseInputs(env, now);
  const warn = (message) => log(`::warning::${escapeAnnotation(message)}`);

  const tag = latestTag(readTags({ cwd: config.workspace, exec, warn }));
  const version = formatVersion(incrementVersion(parseVersion(tag), config.incrementType, config.increment));
  const title = `${config.prefix}${version}`;
  log(`Latest tag: ${tag} -> milestone title: ${title}`);
  writeOutputs(env, { title, version });

  const client = createClient({ token: config.token, apiUrl: config.apiUrl, fetchImpl });
  const { milestone, created } = await createMilestone(client, config.repository, {
    title,
    description: config.description,
    dueOn: config.dueOn,
  });
  if (created) {
    log(`Created milestone '${milestone.title}' (#${milestone.number})${config.dueOn ? ` due ${config.dueOn}` : ''}`);
  } else {
    warn(`Milestone '${milestone.title}' already exists (#${milestone.number}, ${milestone.state}); returning it unchanged`);
  }

  const outputs = { title, version, number: milestone.number };
  writeOutputs(env, { number: milestone.number });
  writeSummary(
    env,
    `${created ? 'Created' : 'Reused'} milestone [${title}](${milestone.url}) (#${milestone.number}) from latest tag \`${tag}\``,
  );
  return { outputs, tag, milestone, created };
}
