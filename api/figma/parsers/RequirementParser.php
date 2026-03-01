<?php

class RequirementParser
{
    public static function parse(array $frames): array
    {
        $result = [];
        foreach ($frames as $frame) {
            if (!in_array($frame['type'] ?? '', ['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP'])) {
                continue;
            }

            $children       = $frame['children'] ?? [];
            $frameName      = $frame['name'] ?? '';
            $name           = FigmaParser::findTextByNodeName($children, 'Name') ?? $frameName;
            $description    = FigmaParser::findTextByNodeName($children, 'Description');
            $severityStr    = FigmaParser::findTextByNodeName($children, 'Severity') ?? '3';
            $impact         = FigmaParser::findTextByNodeName($children, 'Impact')
                           ?? FigmaParser::findTextByNodeName($children, 'ImpactIfNotMet');
            $moscowRaw      = FigmaParser::findTextByNodeName($children, 'MoSCoW')
                           ?? FigmaParser::findTextByNodeName($children, 'Rating')
                           ?? '';
            $wontReason     = FigmaParser::findTextByNodeName($children, 'WontReason')
                           ?? FigmaParser::findTextByNodeName($children, 'Reason');

            $severity = max(1, min(5, (int)$severityStr ?: 3));
            $moscow   = ScenarioParser::normalizeMoscow($moscowRaw);

            $result[] = [
                'figma_node_id'    => $frame['id'] ?? null,
                'name'             => $name,
                'description'      => $description,
                'severity'         => $severity,
                'impact_if_not_met' => $impact,
                'moscow_rating'    => $moscow,
                'wont_have_reason' => ($moscow === 'Wont') ? $wontReason : null,
            ];
        }
        return $result;
    }
}
