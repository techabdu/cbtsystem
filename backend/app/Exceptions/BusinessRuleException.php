<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by the service layer when a business rule is violated
 * (e.g. "Only verified results can be published", "Student already enrolled").
 *
 * Extends RuntimeException so existing `catch (\RuntimeException)` blocks in
 * controllers keep working, while the global exception handler can render it
 * as a clean 422 envelope for any controller that does NOT catch it.
 */
class BusinessRuleException extends RuntimeException
{
}
