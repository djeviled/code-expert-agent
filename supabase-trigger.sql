-- ============================================================
-- AUTO BALANCE CHARGE TRIGGER
-- Fires when agent marks project as DELIVERED
-- ============================================================

-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_project_delivered()
RETURNS TRIGGER AS $$
DECLARE
  p_record RECORD;
  user_email TEXT;
  bundle_price_id TEXT;
  balance_cents INTEGER;
BEGIN
  -- Only fire when status changes TO 'delivered'
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN

    -- Get project + user + payment info in one query
    SELECT
      pr.id        AS project_id,
      pr.user_id,
      us.email     AS user_email,
      py.bundle_price_id,
      py.bundle_amount_cents - py.bundle_amount_paid AS balance_due_cents
    INTO p_record
    FROM public.projects pr
    JOIN public.users us ON us.id = pr.user_id
    JOIN public.payments py ON py.project_id = pr.id
    WHERE pr.id = NEW.id;

    -- Only proceed if there's a balance due
    IF p_record.balance_due_cents > 0 THEN
      -- Fire balance charge webhook
      -- This hits our /api/payments/charge-balance endpoint
      PERFORM net.http_post(
        url      := current_setting('app.settings.balance_charge_webhook_url', true),
        headers  := '{"Content-Type": "application/json"}'::jsonb,
        body     := format(
          '{"payment_id":"%s","project_id":"%s","bundle_price_id":"%s","amount_cents":%s}',
          p_record.project_id,
          p_record.project_id,
          p_record.bundle_price_id,
          p_record.balance_due_cents
        )
      );

      -- Also update payment status immediately as backup
      UPDATE public.payments
      SET
        balance_status = 'charging',
        updated_at     = NOW()
      WHERE project_id = NEW.id AND balance_status = 'pending';

      RAISE NOTICE 'Balance charge triggered for project % (user: %) - % cents',
        p_record.project_id, p_record.user_email, p_record.balance_due_cents;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Attach trigger to projects table
DROP TRIGGER IF EXISTS on_project_delivered ON public.projects;
CREATE TRIGGER on_project_delivered
  AFTER UPDATE OF status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_project_delivered();

-- Step 3: Set the webhook URL (Vercel calls this automatically)
ALTER DATABASE postgres SET app.settings.balance_charge_webhook_url TO 'https://djee.zo.space/api/payments/charge-balance';
