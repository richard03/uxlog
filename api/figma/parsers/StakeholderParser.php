<?php

class StakeholderParser
{
    /**
     * Parse top-level FRAME children of the Stakeholders page.
     * Each frame = one stakeholder card.
     */
    public static function parse(array $frames): array
    {
        $result = [];
        foreach ($frames as $frame) {
            if (!in_array($frame['type'] ?? '', ['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP'])) {
                continue;
            }

            $children = $frame['children'] ?? [];
            $frameName = $frame['name'] ?? '';

            // Determine type from frame name prefix
            $type = 'person';
            if (stripos($frameName, 'Group:') === 0 || stripos($frameName, 'Group ') === 0) {
                $type = 'group';
            }

            $name        = FigmaParser::findTextByNodeName($children, 'Name') ?? $frameName;
            $description = FigmaParser::findTextByNodeName($children, 'Description');
            $powerStr    = FigmaParser::findTextByNodeName($children, 'Power');
            $interestStr = FigmaParser::findTextByNodeName($children, 'Interest');

            // Fallback – look for numeric text nodes
            $power   = is_numeric($powerStr)   ? (int)$powerStr   : 5;
            $interest = is_numeric($interestStr) ? (int)$interestStr : 5;

            // Color from first fill of the frame
            $color = null;
            $fills = $frame['fills'] ?? [];
            if (isset($fills[0]['color'])) {
                $color = FigmaParser::rgbaToHex($fills[0]['color']);
            }

            $result[] = [
                'figma_node_id'   => $frame['id']   ?? null,
                'name'            => $name,
                'type'            => $type,
                'power_rating'    => max(0, min(10, $power)),
                'interest_rating' => max(0, min(10, $interest)),
                'description'     => $description,
                'color'           => $color,
            ];
        }
        return $result;
    }
}
