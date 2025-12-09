-- Criação da tabela de passageiros para armazenar dados dos acompanhantes
-- Esta tabela armazena informações de passageiros adicionais em uma reserva

DO $$
BEGIN
    -- Verifica se a tabela já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_passengers') THEN
        CREATE TABLE public.booking_passengers (
            id uuid NOT NULL DEFAULT gen_random_uuid(),
            booking_id uuid NOT NULL,
            passenger_index integer NOT NULL, -- 0 = passageiro principal, 1+ = acompanhantes
            full_name text NOT NULL,
            cpf text,
            birth_date date,
            whatsapp text,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now(),
            CONSTRAINT booking_passengers_pkey PRIMARY KEY (id),
            CONSTRAINT booking_passengers_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE
        );

        -- Índice para melhorar performance nas consultas
        CREATE INDEX idx_booking_passengers_booking_id ON public.booking_passengers(booking_id);
        
        -- Comentários
        COMMENT ON TABLE public.booking_passengers IS 'Armazena dados dos passageiros (principal e acompanhantes) de cada reserva';
        COMMENT ON COLUMN public.booking_passengers.passenger_index IS '0 = passageiro principal (cliente que fez a reserva), 1+ = acompanhantes';
        COMMENT ON COLUMN public.booking_passengers.cpf IS 'CPF do passageiro';
        COMMENT ON COLUMN public.booking_passengers.birth_date IS 'Data de nascimento do passageiro';
        COMMENT ON COLUMN public.booking_passengers.whatsapp IS 'WhatsApp do passageiro';
        
        RAISE NOTICE 'Tabela booking_passengers criada com sucesso.';
    ELSE
        RAISE NOTICE 'Tabela booking_passengers já existe.';
    END IF;
END
$$;

