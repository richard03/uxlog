<?php

class ScenarioParser
{
    private const MOSCOW_MAP = [
        'musthave'    => 'Must',
        'must'        => 'Must',
        'shouldhave'  => 'Should',
        'should'      => 'Should',
        'couldhave'   => 'Could',
        'could'       => 'Could',
        'wonthave'    => 'Wont',
        'wont'        => 'Wont',
        'wouldhave'   => 'Wont',
        'wouldnthave' => 'Wont',
    ];

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
            $moscowRaw   = FigmaParser::findTextByNodeName($children, 'MoSCoW')
                        ?? FigmaParser::findTextByNodeName($children, 'Rating')
                        ?? FigmaParser::findTextByNodeName($children, 'Priority')
                        ?? '';

            $result[] = [
                'figma_node_id' => $frame['id'] ?? null,
                'name'          => $name,
                'description'   => $description,
                'moscow_rating' => self::normalizeMoscow($moscowRaw),
            ];
        }
        return $result;
    }

    public static function normalizeMoscow(string $raw): string
    {
        $key = FigmaParser::normalize($raw);
        return self::MOSCOW_MAP[$key] ?? 'Should';
    }
}
