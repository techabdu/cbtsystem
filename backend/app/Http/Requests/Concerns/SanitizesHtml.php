<?php

namespace App\Http\Requests\Concerns;

use Stevebauman\Purify\Facades\Purify;

trait SanitizesHtml
{
    protected function prepareForValidation(): void
    {
        $fields = $this->htmlFields();
        if (empty($fields)) {
            return;
        }

        $sanitized = [];
        foreach ($fields as $field) {
            $value = $this->input($field);
            if (is_string($value)) {
                $sanitized[$field] = Purify::clean($value);
            }
        }

        if (! empty($sanitized)) {
            $this->merge($sanitized);
        }
    }

    abstract protected function htmlFields(): array;
}
