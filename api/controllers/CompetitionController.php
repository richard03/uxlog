<?php

/**
 * Controller pro CRUD operace nad konkurenčními položkami projektu.
 */
class CompetitionController
{
    /**
     * Ověří, že projekt patří přihlášenému uživateli.
     */
    private function resolveProject(array $params, array $auth): array
    {
        $project = ProjectModel::findOne((int)$params['id'], (int)$auth['sub']);
        if (!$project) {
            http_error(404, 'Project not found');
        }
        return $project;
    }

    /**
     * POST /projects/:id/competitions – vytvoření nové konkurenční položky.
     */
    public function create(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        $data    = request_json();
        validate($data, ['name']);

        $competition = CompetitionModel::create($project['id'], $data);
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response($competition, 201);
    }

    /**
     * PUT /projects/:id/competitions/:cid – aktualizace konkurenční položky.
     */
    public function update(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        $data    = request_json();

        $competition = CompetitionModel::update((int)$params['cid'], $project['id'], $data);
        if (!$competition) {
            http_error(404, 'Competition not found');
        }
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response($competition);
    }

    /**
     * DELETE /projects/:id/competitions/:cid – smazání konkurenční položky.
     */
    public function destroy(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);

        $ok = CompetitionModel::delete((int)$params['cid'], $project['id']);
        if (!$ok) {
            http_error(404, 'Competition not found');
        }
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response(['message' => 'Deleted']);
    }
}
