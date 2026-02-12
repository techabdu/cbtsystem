<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key', 'value', 'value_type', 'description', 'is_public',
    ];

    protected function casts(): array
    {
        return ['is_public' => 'boolean'];
    }

    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    public static function getValue(string $key, mixed $default = null): mixed
    {
        $setting = self::where('key', $key)->first();
        if (!$setting) return $default;
        return self::castValue($setting->value, $setting->value_type);
    }

    public static function setValue(string $key, mixed $value): void
    {
        self::where('key', $key)->update(['value' => (string) $value]);
    }

    public static function getPublicSettings(): array
    {
        return self::public()->get()->mapWithKeys(fn (self $s) => [
            $s->key => self::castValue($s->value, $s->value_type),
        ])->toArray();
    }

    private static function castValue(string $value, string $type): mixed
    {
        return match ($type) {
            'integer' => (int) $value,
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'json'    => json_decode($value, true),
            default   => $value,
        };
    }
}
