<?php

class GoalParser
{
    public static function parse(array $frames): array
    {
        $result = [];
        foreach ($frames as $frame) {
            if (!in_array($frame['type'] ?? '', ['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP'])) {
                continue;
            }

            $children    = $frame['children'] ?? [];
            $frameName   = $frame['name'] ?? '';
            $name        = FigmaParser::findTextByNodeName($children, 'Name') ?? $frameName;
            $description = FigmaParser::findTextByNodeName($children, 'Description');

            // Metrics: look for a child FRAME named "Metrics" and collect its TEXT children
            $metrics = self::extractMetrics($children);

            $result[] = [
                'figma_node_id' => $frame['id'] ?? null,
                'name'          => $name,
                'description'   => $description,
                'metrics'       => $metrics,
            ];
        }
        return $result;
    }

    private static function extractMetrics(array $children): array
    {
        // Try to find a child FRAME/GROUP named "Metrics"
        foreach ($children as $child) {
            $childNameNorm = FigmaParser::normalize($child['name'] ?? '');
            if ($childNameNorm === 'metrics' && isset($child['children'])) {
                $texts = [];
                foreach ($child['children'] as $metricNode) {
                    if (($metricNode['type'] ?? '') === 'TEXT') {
                        $text = trim($metricNode['characters'] ?? '');
                        if ($text !== '') {
                            $texts[] = $text;
                        }
                    }
                }
                return $texts;
            }
        }

        // Fallback: find a TEXT node named "Metrics" and split by newline
        $metricsText = FigmaParser::findTextByNodeName($children, 'Metrics');
        if ($metricsText !== null) {
            return array_values(array_filter(
                array_map('trim', explode("\n", $metricsText)),
                fn($l) => $l !== ''
            ));
        }

        return [];
    }
}
