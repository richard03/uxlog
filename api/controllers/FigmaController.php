<?php

class FigmaController
{
    private function resolveProject(array $params, array $auth): array
    {
        $project = ProjectModel::findOne((int)$params['id'], (int)$auth['sub']);
        if (!$project) {
            http_error(404, 'Project not found');
        }
        return $project;
    }

    /**
     * GET /projects/:id/figma
     * Returns connection info (without access_token) + all cached Figma data.
     */
    public function getConnection(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);

        $connection = FigmaModel::getConnection($project['id']);

        json_response([
            'connection'    => $connection ?: null,
            'stakeholders'  => StakeholderModel::findByProject($project['id']),
            'personas'      => PersonaModel::findByProject($project['id']),
            'goals'         => GoalModel::findByProject($project['id']),
            'scenarios'     => ScenarioModel::findByProject($project['id']),
            'requirements'  => RequirementModel::findByProject($project['id']),
            'competitions'   => CompetitionModel::findByProject($project['id']),
        ]);
    }

    /**
     * PUT /projects/:id/figma
     * Body: { "access_token": "...", "file_id": "..." }
     * Saves (or updates) Figma connection credentials.
     */
    public function setConnection(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        $data    = request_json();
        validate($data, ['access_token', 'file_id']);

        $connection = FigmaModel::upsertConnection(
            $project['id'],
            $data['access_token'],
            $data['file_id']
        );
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);

        json_response(['connection' => $connection]);
    }

    /**
     * GET /projects/:id/figma/sync
     * Reads from Figma API, parses all 5 pages, stores results in DB.
     */
    public function sync(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);

        $conn = FigmaModel::getConnectionWithToken($project['id']);
        if (!$conn) {
            http_error(400, 'No Figma connection configured for this project');
        }

        // Mark as syncing
        FigmaModel::setSyncStatus($project['id'], 'syncing');

        try {
            $client   = new FigmaClient($conn['access_token']);
            $fileData = $client->getFile($conn['file_id']);
            $parsed   = FigmaParser::parseFile($fileData, $client, $conn['file_id']);

            // Store everything in one transaction
            Database::transaction(function (\PDO $pdo) use ($project, $parsed): void {
                StakeholderModel::replaceAllForProject($project['id'], $parsed['stakeholders'], $pdo);
                PersonaModel::mergeAllForProject($project['id'], $parsed['personas'], $pdo);
                GoalModel::replaceAllForProject($project['id'], $parsed['goals'],           $pdo);
                ScenarioModel::replaceAllForProject($project['id'], $parsed['scenarios'],   $pdo);
                RequirementModel::replaceAllForProject($project['id'], $parsed['requirements'], $pdo);
            });

            FigmaModel::markSynced($project['id']);
            ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);

            json_response([
                'message'      => 'Sync complete',
                'counts'       => array_map('count', $parsed),
                'stakeholders' => StakeholderModel::findByProject($project['id']),
                'personas'     => PersonaModel::findByProject($project['id']),
                'goals'        => GoalModel::findByProject($project['id']),
                'scenarios'    => ScenarioModel::findByProject($project['id']),
                'requirements' => RequirementModel::findByProject($project['id']),
            ]);

        } catch (Throwable $e) {
            FigmaModel::setSyncStatus($project['id'], 'error', $e->getMessage());
            http_error(502, 'Figma sync failed: ' . $e->getMessage());
        }
    }
}
