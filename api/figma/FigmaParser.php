<?php

class FigmaParser
{
    /**
     * Parse all 5 pages from a Figma file document.
     * Returns ['stakeholders'=>[], 'personas'=>[], 'goals'=>[], 'scenarios'=>[], 'requirements'=>[]]
     */
    public static function parseFile(array $fileData, FigmaClient $client, string $fileId): array
    {
        $pages = $fileData['document']['children'] ?? [];

        $result = [
            'stakeholders' => [],
            'personas'     => [],
            'goals'        => [],
            'scenarios'    => [],
            'requirements' => [],
        ];

        // Collect image refs for personas before fetching
        $imageRefs = [];
        $personasPage = self::findPageByName($pages, 'Personas');
        if ($personasPage) {
            $imageRefs = PersonaParser::collectImageRefs($personasPage['children'] ?? []);
        }

        // Resolve portrait URLs
        $imageMap = [];
        if ($imageRefs) {
            try {
                $imageMap = $client->getImages($fileId, $imageRefs);
            } catch (RuntimeException $e) {
                // Non-fatal – portraits simply won't load
            }
        }

        foreach ($pages as $page) {
            $name     = strtolower(trim($page['name'] ?? ''));
            $children = $page['children'] ?? [];

            if (str_contains($name, 'stakeholder')) {
                $result['stakeholders'] = StakeholderParser::parse($children);
            } elseif (str_contains($name, 'persona')) {
                $result['personas'] = PersonaParser::parse($children, $imageMap);
            } elseif (str_contains($name, 'goal')) {
                $result['goals'] = GoalParser::parse($children);
            } elseif (str_contains($name, 'scenario')) {
                $result['scenarios'] = ScenarioParser::parse($children);
            } elseif (str_contains($name, 'requirement')) {
                $result['requirements'] = RequirementParser::parse($children);
            }
        }

        return $result;
    }

    private static function findPageByName(array $pages, string $name): ?array
    {
        $nameLower = strtolower($name);
        foreach ($pages as $page) {
            if (str_contains(strtolower($page['name'] ?? ''), $nameLower)) {
                return $page;
            }
        }
        return null;
    }

    /**
     * Find a TEXT node by its `name` property among node children.
     * Case-insensitive, strips non-alphanumeric characters for matching.
     * Recurses one level deep into child groups/frames.
     *
     * @param array  $children  Array of Figma nodes
     * @param string $label     The node name to search for
     * @return string|null      The text content or null if not found
     */
    public static function findTextByNodeName(array $children, string $label): ?string
    {
        $needle = self::normalize($label);

        foreach ($children as $child) {
            if (self::normalize($child['name'] ?? '') === $needle && ($child['type'] ?? '') === 'TEXT') {
                return trim($child['characters'] ?? '');
            }
        }

        // One level deeper
        foreach ($children as $child) {
            $type = $child['type'] ?? '';
            if (in_array($type, ['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE'])) {
                $result = self::findTextByNodeName($child['children'] ?? [], $label);
                if ($result !== null) {
                    return $result;
                }
            }
        }

        return null;
    }

    public static function normalize(string $s): string
    {
        return strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $s));
    }

    /**
     * Convert Figma RGBA float color (0-1) to a CSS hex string.
     */
    public static function rgbaToHex(array $color): string
    {
        $r = (int)round(($color['r'] ?? 0) * 255);
        $g = (int)round(($color['g'] ?? 0) * 255);
        $b = (int)round(($color['b'] ?? 0) * 255);
        return sprintf('#%02x%02x%02x', $r, $g, $b);
    }
}
