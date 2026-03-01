<?php

class ProjectController
{
    public function index(array $params): void
    {
        $auth = require_auth();
        $projects = ProjectModel::findAllByUser((int)$auth['sub']);
        json_response($projects);
    }

    public function create(array $params): void
    {
        $auth = require_auth();
        $data = request_json();
        validate($data, ['name']);

        $project = ProjectModel::create((int)$auth['sub'], $data);
        json_response($project, 201);
    }

    public function show(array $params): void
    {
        $auth    = require_auth();
        $project = ProjectModel::findOne((int)$params['id'], (int)$auth['sub']);
        if (!$project) {
            http_error(404, 'Project not found');
        }
        json_response($project);
    }

    public function update(array $params): void
    {
        $auth    = require_auth();
        $data    = request_json();
        $project = ProjectModel::update((int)$params['id'], (int)$auth['sub'], $data);
        if (!$project) {
            http_error(404, 'Project not found');
        }
        json_response($project);
    }

    public function destroy(array $params): void
    {
        $auth = require_auth();
        $ok   = ProjectModel::delete((int)$params['id'], (int)$auth['sub']);
        if (!$ok) {
            http_error(404, 'Project not found');
        }
        json_response(['message' => 'Deleted']);
    }
}
