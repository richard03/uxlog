<?php

/**
 * Controller pro CRUD operace nad personami projektu.
 * Persony mohou být vytvořené lokálně v aplikaci nebo importované z Figma.
 */
class PersonaController
{
    /** Ověří, že projekt patří přihlášenému uživateli. */
    private function resolveProject(array $params, array $auth): array
    {
        $project = ProjectModel::findOne((int)$params['id'], (int)$auth['sub']);
        if (!$project) {
            http_error(404, 'Project not found');
        }
        return $project;
    }

    /** POST /projects/:id/personas – vytvoření nové persony. */
    public function create(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        $data    = request_json();
        validate($data, ['name']);

        $persona = PersonaModel::create($project['id'], $data);
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response($persona, 201);
    }

    /** PUT /projects/:id/personas/:pid – aktualizace persony. */
    public function update(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        $data    = request_json();

        $persona = PersonaModel::update((int)$params['pid'], $project['id'], $data);
        if (!$persona) {
            http_error(404, 'Persona not found');
        }
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response($persona);
    }

    /** DELETE /projects/:id/personas/:pid – smazání persony. */
    public function destroy(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);

        $ok = PersonaModel::delete((int)$params['pid'], $project['id']);
        if (!$ok) {
            http_error(404, 'Persona not found');
        }
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response(['message' => 'Deleted']);
    }
}
