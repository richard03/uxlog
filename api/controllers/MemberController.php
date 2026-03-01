<?php

class MemberController
{
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
        json_response(MemberModel::findByProject($project['id']));
    }

    public function create(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        $data    = request_json();
        validate($data, ['name']);

        $member = MemberModel::create($project['id'], $data);
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response($member, 201);
    }

    public function update(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        $data    = request_json();

        $member = MemberModel::update((int)$params['mid'], $project['id'], $data);
        if (!$member) {
            http_error(404, 'Member not found');
        }
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response($member);
    }

    public function destroy(array $params): void
    {
        $auth    = require_auth();
        $project = $this->resolveProject($params, $auth);
        $ok = MemberModel::delete((int)$params['mid'], $project['id']);
        if (!$ok) {
            http_error(404, 'Member not found');
        }
        ProjectModel::touchLastWorked($project['id'], (int)$auth['sub']);
        json_response(['message' => 'Deleted']);
    }
}
