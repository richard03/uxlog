<?php

class TaskController
{
    /** Verify the project belongs to the authenticated user. */
    private function resolveProject(array $params, array $auth): array
    {
        $project = ProjectModel::findOne((int)$params['id'], (int)$auth['sub']);
        if (!$project) {
            http_error(404, 'Project not found');
        }
        return $project;
    }

    public function index(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        json_response(TaskModel::findByProject($project['id']));
    }

    public function create(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        $data    = request_json();
        validate($data, ['title']);

        $task = TaskModel::create($project['id'], $data);
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response($task, 201);
    }

    public function update(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        $data    = request_json();

        $task = TaskModel::update((int)$params['tid'], $project['id'], $data);
        if (!$task) {
            http_error(404, 'Task not found');
        }
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response($task);
    }

    public function destroy(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        $ok = TaskModel::delete((int)$params['tid'], $project['id']);
        if (!$ok) {
            http_error(404, 'Task not found');
        }
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response(['message' => 'Deleted']);
    }
}
