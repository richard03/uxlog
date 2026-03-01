<?php

class PersonaParser
{
    /**
     * Collect all imageRef strings from RECTANGLE nodes with IMAGE fills.
     * Called before fetching image URLs.
     */
    public static function collectImageRefs(array $frames): array
    {
        $refs = [];
        foreach ($frames as $frame) {
            self::collectImageRefsRecursive($frame, $refs);
        }
        return array_values(array_unique($refs));
    }

    private static function collectImageRefsRecursive(array $node, array &$refs): void
    {
        if (($node['type'] ?? '') === 'RECTANGLE') {
            foreach ($node['fills'] ?? [] as $fill) {
                if (($fill['type'] ?? '') === 'IMAGE' && isset($fill['imageRef'])) {
                    $refs[] = $fill['imageRef'];
                }
            }
        }
        foreach ($node['children'] ?? [] as $child) {
            self::collectImageRefsRecursive($child, $refs);
        }
    }

    /**
     * Parse top-level FRAME children of the Personas page.
     * $imageMap: ['imageRef' => 'url'] resolved from Figma images endpoint.
     */
    public static function parse(array $frames, array $imageMap): array
    {
        $result = [];
        foreach ($frames as $frame) {
            if (!in_array($frame['type'] ?? '', ['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP'])) {
                continue;
            }

            $children  = $frame['children'] ?? [];
            $frameName = $frame['name'] ?? '';

            // Determine type from name or a "Type" text node
            $typeText = FigmaParser::findTextByNodeName($children, 'Type') ?? '';
            $type     = (stripos($typeText, 'persona') !== false) ? 'persona' : 'prototype';

            $name        = FigmaParser::findTextByNodeName($children, 'Name') ?? $frameName;
            $description = FigmaParser::findTextByNodeName($children, 'Description');
            $motivation  = FigmaParser::findTextByNodeName($children, 'Motivation');
            $needs       = FigmaParser::findTextByNodeName($children, 'Needs');
            $problems    = FigmaParser::findTextByNodeName($children, 'Problems');

            // Find portrait: RECTANGLE node with IMAGE fill
            $portraitUrl = self::findPortraitUrl($children, $imageMap);

            $result[] = [
                'figma_node_id' => $frame['id']  ?? null,
                'name'          => $name,
                'type'          => $type,
                'portrait_url'  => $portraitUrl,
                'description'   => $description,
                'motivation'    => $motivation,
                'needs'         => $needs,
                'problems'      => $problems,
            ];
        }
        return $result;
    }

    private static function findPortraitUrl(array $children, array $imageMap): ?string
    {
        foreach ($children as $child) {
            if (($child['type'] ?? '') === 'RECTANGLE') {
                foreach ($child['fills'] ?? [] as $fill) {
                    if (($fill['type'] ?? '') === 'IMAGE' && isset($fill['imageRef'])) {
                        return $imageMap[$fill['imageRef']] ?? null;
                    }
                }
            }
            // Recurse
            if (isset($child['children'])) {
                $url = self::findPortraitUrl($child['children'], $imageMap);
                if ($url !== null) {
                    return $url;
                }
            }
        }
        return null;
    }
}
